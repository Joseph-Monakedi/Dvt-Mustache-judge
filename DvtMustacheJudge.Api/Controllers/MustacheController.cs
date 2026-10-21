using DvtMustacheJudge.Api.Data;
using DvtMustacheJudge.Api.Models;
using DvtMustacheJudge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DvtMustacheJudge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MustacheController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IImageStorageService _storageService;
    private readonly IGeminiJudgeService _geminiService;
    private readonly IContentModerationService _moderationService;
    private readonly IApiRateLimiter _rateLimiter;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;
    private readonly ITokenService _tokenService;
    private readonly ILogger<MustacheController> _logger;

    public MustacheController(
        AppDbContext dbContext,
        IImageStorageService storageService,
        IGeminiJudgeService geminiService,
        IContentModerationService moderationService,
        IApiRateLimiter rateLimiter,
        IWebHostEnvironment environment,
        IConfiguration configuration,
        ITokenService tokenService,
        ILogger<MustacheController> logger)
    {
        _dbContext = dbContext;
        _storageService = storageService;
        _geminiService = geminiService;
        _moderationService = moderationService;
        _rateLimiter = rateLimiter;
        _environment = environment;
        _configuration = configuration;
        _tokenService = tokenService;
        _logger = logger;
    }

    /// <summary>
    /// Judge a contestant's mustache photo and persist the verdict.
    /// </summary>
    [HttpPost("judge")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(JudgeResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Judge([FromForm] JudgeRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length < 2)
        {
            return BadRequest(new { error = "Contestant name is required and must be at least 2 characters." });
        }

        if (request.Name.Length > 50)
        {
            return BadRequest(new { error = "Contestant name must not exceed 50 characters." });
        }

        // 1. Moderate Contestant Name for vulgarity, NSFW, or profanity
        var nameModeration = _moderationService.CheckName(request.Name);
        if (!nameModeration.IsAppropriate)
        {
            _logger.LogWarning("Submission denied due to inappropriate or vulgar name: '{Name}'", request.Name);
            return BadRequest(new { error = $"Submission rejected: Contestant name contains inappropriate or vulgar language. ({nameModeration.Reason})" });
        }

        if (request.Image == null || request.Image.Length == 0)
        {
            return BadRequest(new { error = "Contestant image is required." });
        }

        if (request.Image.Length > 8 * 1024 * 1024)
        {
            return BadRequest(new { error = "Image file size exceeds the 8MB limit." });
        }

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(request.Image.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || !allowedExtensions.Contains(ext))
        {
            if (!request.Image.ContentType.StartsWith("image/"))
            {
                return BadRequest(new { error = "Invalid image format. Allowed formats: JPEG, PNG, WebP." });
            }
        }

        try
        {
            // 1. Must be authenticated to enter contest
            Guid? authenticatedUserId = null;
            var authHeader = Request.Headers.Authorization.ToString();
            if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                var payload = _tokenService.ValidateToken(token);
                if (payload != null)
                {
                    authenticatedUserId = payload.UserId;
                }
            }

            if (!authenticatedUserId.HasValue)
            {
                return Unauthorized(new { error = "Please sign in or register to enter the mustache contest." });
            }

            var user = await _dbContext.Users.FindAsync(authenticatedUserId.Value);
            if (user == null)
            {
                return Unauthorized(new { error = "Contestant account not found. Please register or sign in again." });
            }

            // Gating: Contestant must have R100 contest fee verified
            if (!user.LeaderboardPaid && user.Role != "Admin")
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    error = "R100 Contest Entry required. Please have an Admin verify your payment before entering.",
                    paywall = true,
                    fee = "R100",
                    userId = user.Id
                });
            }

            var contestantName = !string.IsNullOrWhiteSpace(request.Name) ? request.Name.Trim() : user.FullName;

            string? cleanShaveUrl = user.CleanShaveImageUrl;
            byte[]? cleanShaveBytes = null;
            string? cleanShaveMime = null;

            // Check if contestant submitted a clean shave baseline image in this request
            if (request.CleanShaveImage != null && request.CleanShaveImage.Length > 0)
            {
                using var cMs = new MemoryStream();
                await request.CleanShaveImage.CopyToAsync(cMs, cancellationToken);
                cleanShaveBytes = cMs.ToArray();
                cleanShaveMime = request.CleanShaveImage.ContentType;

                using var cUploadMs = new MemoryStream(cleanShaveBytes);
                var cUpload = await _storageService.UploadImageAsync(cUploadMs, request.CleanShaveImage.FileName, cleanShaveMime);
                cleanShaveUrl = cUpload.ImageUrl;
                user.CleanShaveImageUrl = cleanShaveUrl;
                user.CleanShaveUploadedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            // Gating: Contestant MUST have a Day 1 clean shave photo saved
            if (string.IsNullOrWhiteSpace(cleanShaveUrl))
            {
                return BadRequest(new { error = "You must first take and submit your Day 1 Clean Shave baseline photo before entering contest photos." });
            }

            // If cleanShaveBytes is null, load from local disk if available
            if (cleanShaveBytes == null && !string.IsNullOrWhiteSpace(cleanShaveUrl))
            {
                try
                {
                    var webRoot = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
                    var uri = new Uri(cleanShaveUrl, UriKind.RelativeOrAbsolute);
                    var localPath = uri.IsAbsoluteUri ? uri.AbsolutePath : cleanShaveUrl;
                    var diskPath = Path.Combine(webRoot, localPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                    if (System.IO.File.Exists(diskPath))
                    {
                        cleanShaveBytes = await System.IO.File.ReadAllBytesAsync(diskPath, cancellationToken);
                        cleanShaveMime = "image/jpeg";
                    }
                }
                catch
                {
                    // Ignore fallback if reading baseline fails
                }
            }

            // Read image into a reusable byte array for in-memory moderation and judging
            byte[] imageBytes;
            using (var memoryStream = new MemoryStream())
            {
                await request.Image.CopyToAsync(memoryStream, cancellationToken);
                imageBytes = memoryStream.ToArray();
            }

            // 2. Call Gemini AI judge for vision analysis & NSFW/vulgarity detection FIRST (queues if rate limited)
            GeminiJudgeResult judgeResult;
            using (var aiStream = new MemoryStream(imageBytes))
            using (var csStream = cleanShaveBytes != null ? new MemoryStream(cleanShaveBytes) : null)
            {
                judgeResult = await _geminiService.JudgeMustacheAsync(
                    aiStream,
                    request.Image.ContentType,
                    contestantName,
                    csStream,
                    cleanShaveMime,
                    cancellationToken);
            }

            // 2.5 Check for Prompt or SQL injection attempts (all injections are classified as Wooden Spoon)
            if (InjectionDetector.IsInjectionAttempt(contestantName, out _) ||
                judgeResult.WoodenSpoonReason == "Prompt / SQL Injection")
            {
                judgeResult.IsAppropriate = true;
                judgeResult.InappropriateReason = null;
                InjectionDetector.ApplyWoodenSpoonInjectionVerdict(judgeResult);
            }

            // 3. Moderate Image: Deny if NSFW, nudity, vulgar gestures, or inappropriate content detected
            if (!judgeResult.IsAppropriate)
            {
                _logger.LogWarning("Submission denied due to inappropriate/NSFW image content for contestant '{Name}': {Reason}",
                    contestantName, judgeResult.InappropriateReason);
                // The image stream was in-memory only and is NEVER uploaded to storage or persisted in the DB.
                return BadRequest(new { error = $"Submission rejected: Inappropriate or NSFW behaviour detected in image. ({judgeResult.InappropriateReason ?? "Content policy violation"})" });
            }

            // 4. Upload image to storage ONLY AFTER both name and photo are verified appropriate
            string imageUrl;
            string thumbnailUrl;
            using (var uploadStream = new MemoryStream(imageBytes))
            {
                var uploadResult = await _storageService.UploadImageAsync(
                    uploadStream,
                    request.Image.FileName,
                    request.Image.ContentType);

                imageUrl = uploadResult.ImageUrl;
                thumbnailUrl = uploadResult.ThumbnailUrl;
            }

            try
            {
                var calculatedGrowthScore = judgeResult.GrowthScore > 0 
                    ? Math.Clamp(judgeResult.GrowthScore, 0, 100)
                    : (cleanShaveUrl != null ? Math.Clamp(judgeResult.OverallScore, 10, 100) : 0);

                var calculatedGrowthAnalysis = !string.IsNullOrWhiteSpace(judgeResult.GrowthAnalysis)
                    ? judgeResult.GrowthAnalysis
                    : (cleanShaveUrl != null ? $"Measured transformation from Day 1 Clean Shave! Growth progressed into a solid {judgeResult.StyleCategory}." : null);

                // 5. Save entry to database
                var entry = new MustacheEntry
                {
                    Id = Guid.NewGuid(),
                    ContestantName = contestantName,
                    ImageUrl = imageUrl,
                    ThumbnailUrl = thumbnailUrl,
                    CleanShaveImageUrl = cleanShaveUrl,
                    GrowthScore = calculatedGrowthScore,
                    GrowthAnalysis = calculatedGrowthAnalysis,
                    OverallScore = Math.Clamp(judgeResult.OverallScore, 0, 100),
                    DensityScore = Math.Clamp(judgeResult.DensityScore, 0, 10),
                    SymmetryScore = Math.Clamp(judgeResult.SymmetryScore, 0, 10),
                    SwaggerScore = Math.Clamp(judgeResult.SwaggerScore, 0, 10),
                    IsWoodenSpoon = judgeResult.IsWoodenSpoon,
                    WoodenSpoonReason = judgeResult.WoodenSpoonReason,
                    InnovationScore = Math.Clamp(judgeResult.InnovationScore, 0, 10),
                    DedicationScore = Math.Clamp(judgeResult.DedicationScore, 0, 10),
                    FunninessScore = Math.Clamp(judgeResult.FunninessScore, 0, 10),
                    MustacheTitle = string.IsNullOrWhiteSpace(judgeResult.MustacheTitle)
                        ? (judgeResult.OverallScore == 0 ? "Follicle 404" : "The Bristle Contender")
                        : judgeResult.MustacheTitle,
                    StyleCategory = string.IsNullOrWhiteSpace(judgeResult.StyleCategory)
                        ? "Other"
                        : judgeResult.StyleCategory,
                    RoastCommentary = judgeResult.Roast,
                    CelebrityTwin = judgeResult.CelebrityTwin,
                    VerdictBadge = string.IsNullOrWhiteSpace(judgeResult.VerdictBadge)
                        ? (judgeResult.OverallScore == 0 ? "Zero-Bristle Deficit" : "Certified Movember Hero")
                        : judgeResult.VerdictBadge,
                    CreatedAt = DateTime.UtcNow,
                    IsHidden = false,
                    UserId = authenticatedUserId
                };

                _dbContext.MustacheEntries.Add(entry);
                await _dbContext.SaveChangesAsync();

                bool isEligible = user.LeaderboardPaid || user.Role == "Admin";

                var higherScoreExists = await _dbContext.MustacheEntries
                    .AnyAsync(e => e.UserId == authenticatedUserId.Value && e.Id != entry.Id && !e.IsHidden && e.OverallScore > entry.OverallScore);
                bool isBest = !higherScoreExists;

                var responseDto = new JudgeResponseDto
                {
                    Id = entry.Id,
                    ContestantName = entry.ContestantName,
                    ImageUrl = entry.ImageUrl,
                    ThumbnailUrl = entry.ThumbnailUrl,
                    CleanShaveImageUrl = entry.CleanShaveImageUrl,
                    OverallScore = entry.OverallScore,
                    DensityScore = entry.DensityScore,
                    SymmetryScore = entry.SymmetryScore,
                    SwaggerScore = entry.SwaggerScore,
                    GrowthScore = entry.GrowthScore,
                    GrowthAnalysis = entry.GrowthAnalysis,
                    IsWoodenSpoon = entry.IsWoodenSpoon,
                    WoodenSpoonReason = entry.WoodenSpoonReason,
                    InnovationScore = entry.InnovationScore,
                    DedicationScore = entry.DedicationScore,
                    FunninessScore = entry.FunninessScore,
                    MustacheTitle = entry.MustacheTitle,
                    StyleCategory = entry.StyleCategory,
                    Roast = entry.RoastCommentary,
                    CelebrityTwin = entry.CelebrityTwin,
                    VerdictBadge = entry.VerdictBadge,
                    CreatedAt = entry.CreatedAt,
                    IsLeaderboardEligible = isEligible,
                    IsBestEntry = isBest,
                    UserId = authenticatedUserId
                };

                return Ok(responseDto);
            }
            catch (Exception)
            {
                // If DB save fails, ensure the uploaded image is cleaned up immediately
                await _storageService.DeleteImageAsync(imageUrl);
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error judging mustache for {Name}: {Message}", request.Name, ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Upload or update the logged-in contestant's Day 1 Clean Shave baseline photo.
    /// </summary>
    [HttpPost("clean-shave")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadCleanShave([FromForm] IFormFile image, CancellationToken cancellationToken = default)
    {
        var authHeader = Request.Headers.Authorization.ToString();
        string? token = null;
        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = authHeader.Substring("Bearer ".Length).Trim();
        }

        var payload = _tokenService.ValidateToken(token);
        if (payload == null)
        {
            return Unauthorized(new { error = "Please log in to upload your Day 1 clean shave baseline photo." });
        }

        var user = await _dbContext.Users.FindAsync(payload.UserId);
        if (user == null)
        {
            return NotFound(new { error = "User account not found." });
        }

        if (image == null || image.Length == 0)
        {
            return BadRequest(new { error = "Clean shave image is required." });
        }

        if (image.Length > 8 * 1024 * 1024)
        {
            return BadRequest(new { error = "Image file size exceeds the 8MB limit." });
        }

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || !allowedExtensions.Contains(ext))
        {
            if (!image.ContentType.StartsWith("image/"))
            {
                return BadRequest(new { error = "Invalid image format. Allowed formats: JPEG, PNG, WebP." });
            }
        }

        using var memoryStream = new MemoryStream();
        await image.CopyToAsync(memoryStream, cancellationToken);
        var imageBytes = memoryStream.ToArray();

        using var uploadStream = new MemoryStream(imageBytes);
        var uploadResult = await _storageService.UploadImageAsync(
            uploadStream,
            image.FileName,
            image.ContentType);

        user.CleanShaveImageUrl = uploadResult.ImageUrl;
        user.CleanShaveUploadedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            cleanShaveImageUrl = user.CleanShaveImageUrl,
            cleanShaveUploadedAt = user.CleanShaveUploadedAt,
            message = "Day 1 Clean Shave baseline photo saved successfully!"
        });
    }

    /// <summary>
    /// Retrieve the live leaderboard.
    /// Only top-scoring entry per contestant is displayed.
    /// Non-legacy contestants must have their R100 Leaderboard fee approved by admin.
    /// </summary>
    [HttpGet("leaderboard")]
    [ProducesResponseType(typeof(LeaderboardResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLeaderboard(
        [FromQuery] int limit = 50,
        [FromQuery] string? category = null,
        [FromQuery] string division = "championship")
    {
        if (limit <= 0) limit = 50;
        if (limit > 200) limit = 200;

        var isWoodenSpoon = string.Equals(division, "woodenspoon", StringComparison.OrdinalIgnoreCase);

        var allVisible = await _dbContext.MustacheEntries
            .Include(e => e.User)
            .AsNoTracking()
            .Where(e => !e.IsHidden)
            .ToListAsync();

        // Eligible entries:
        // If UserId is present, user must have LeaderboardPaid == true.
        // Legacy / seed entries without UserId are preserved.
        var eligible = allVisible
            .Where(e => e.UserId == null || (e.User != null && e.User.LeaderboardPaid))
            .ToList();

        // Calculate division counts (deduplicated by contestant: only top scoring entry per contestant)
        var championshipCount = eligible
            .Where(e => !e.IsWoodenSpoon)
            .GroupBy(e => e.UserId.HasValue ? e.UserId.Value.ToString() : e.Id.ToString())
            .Count();

        var woodenSpoonCount = eligible
            .Where(e => e.IsWoodenSpoon)
            .GroupBy(e => e.UserId.HasValue ? e.UserId.Value.ToString() : e.Id.ToString())
            .Count();

        var divisionEntries = eligible.Where(e => e.IsWoodenSpoon == isWoodenSpoon).ToList();

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            divisionEntries = divisionEntries
                .Where(e => string.Equals(e.StyleCategory, category, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        // Deduplicate per contestant: single best score entry per contestant!
        var topPerContestant = divisionEntries
            .GroupBy(e => e.UserId.HasValue ? e.UserId.Value.ToString() : e.Id.ToString())
            .Select(g => g.OrderByDescending(e => e.OverallScore).ThenByDescending(e => e.CreatedAt).First())
            .OrderByDescending(e => e.OverallScore)
            .ThenByDescending(e => e.CreatedAt)
            .ToList();

        var totalEntries = topPerContestant.Count;

        var entries = topPerContestant
            .Take(limit)
            .Select((e, idx) => new LeaderboardEntryDto
            {
                Rank = idx + 1,
                Id = e.Id,
                ContestantName = e.ContestantName,
                ImageUrl = e.ImageUrl,
                ThumbnailUrl = e.ThumbnailUrl,
                CleanShaveImageUrl = e.CleanShaveImageUrl,
                OverallScore = e.OverallScore,
                DensityScore = e.DensityScore,
                SymmetryScore = e.SymmetryScore,
                SwaggerScore = e.SwaggerScore,
                GrowthScore = e.GrowthScore,
                GrowthAnalysis = e.GrowthAnalysis,
                IsWoodenSpoon = e.IsWoodenSpoon,
                WoodenSpoonReason = e.WoodenSpoonReason,
                InnovationScore = e.InnovationScore,
                DedicationScore = e.DedicationScore,
                FunninessScore = e.FunninessScore,
                MustacheTitle = e.MustacheTitle,
                StyleCategory = e.StyleCategory,
                Roast = e.RoastCommentary,
                CelebrityTwin = e.CelebrityTwin,
                VerdictBadge = e.VerdictBadge,
                CreatedAt = e.CreatedAt
            })
            .ToList();

        return Ok(new LeaderboardResponseDto
        {
            TotalEntries = totalEntries,
            ChampionshipEntriesCount = championshipCount,
            WoodenSpoonEntriesCount = woodenSpoonCount,
            Division = isWoodenSpoon ? "woodenspoon" : "championship",
            Entries = entries
        });
    }

    /// <summary>
    /// Retrieve all submissions for the logged in user's dashboard vault.
    /// </summary>
    [HttpGet("my-entries")]
    [ProducesResponseType(typeof(UserEntriesResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyEntries()
    {
        var authHeader = Request.Headers.Authorization.ToString();
        string? token = null;
        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = authHeader.Substring("Bearer ".Length).Trim();
        }

        var payload = _tokenService.ValidateToken(token);
        if (payload == null)
        {
            return Unauthorized(new { error = "Please log in to access your personal dashboard vault." });
        }

        var user = await _dbContext.Users.FindAsync(payload.UserId);
        if (user == null)
        {
            return NotFound(new { error = "User account not found." });
        }

        var userEntries = await _dbContext.MustacheEntries
            .AsNoTracking()
            .Where(e => e.UserId == user.Id && !e.IsHidden)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        var bestEntry = userEntries.OrderByDescending(e => e.OverallScore).ThenByDescending(e => e.CreatedAt).FirstOrDefault();

        // Calculate user's rank on the public leaderboard if their R100 fee is approved
        int? rank = null;
        if (user.LeaderboardPaid && bestEntry != null)
        {
            var isWoodenSpoon = bestEntry.IsWoodenSpoon;
            var allLeaderboard = await _dbContext.MustacheEntries
                .Include(e => e.User)
                .AsNoTracking()
                .Where(e => !e.IsHidden && e.IsWoodenSpoon == isWoodenSpoon)
                .Where(e => e.UserId == null || (e.User != null && e.User.LeaderboardPaid))
                .ToListAsync();

            var topPerUser = allLeaderboard
                .GroupBy(e => e.UserId.HasValue ? e.UserId.Value.ToString() : e.Id.ToString())
                .Select(g => g.OrderByDescending(x => x.OverallScore).ThenByDescending(x => x.CreatedAt).First())
                .OrderByDescending(x => x.OverallScore)
                .ThenByDescending(x => x.CreatedAt)
                .ToList();

            var userIndex = topPerUser.FindIndex(e => e.UserId == user.Id);
            if (userIndex >= 0)
            {
                rank = userIndex + 1;
            }
        }

        var entryDtos = userEntries.Select(e => new UserEntryDto
        {
            Id = e.Id,
            ContestantName = e.ContestantName,
            ImageUrl = e.ImageUrl,
            ThumbnailUrl = e.ThumbnailUrl,
            CleanShaveImageUrl = e.CleanShaveImageUrl,
            OverallScore = e.OverallScore,
            DensityScore = e.DensityScore,
            SymmetryScore = e.SymmetryScore,
            SwaggerScore = e.SwaggerScore,
            GrowthScore = e.GrowthScore,
            GrowthAnalysis = e.GrowthAnalysis,
            IsWoodenSpoon = e.IsWoodenSpoon,
            WoodenSpoonReason = e.WoodenSpoonReason,
            InnovationScore = e.InnovationScore,
            DedicationScore = e.DedicationScore,
            FunninessScore = e.FunninessScore,
            MustacheTitle = e.MustacheTitle,
            StyleCategory = e.StyleCategory,
            Roast = e.RoastCommentary,
            CelebrityTwin = e.CelebrityTwin,
            VerdictBadge = e.VerdictBadge,
            CreatedAt = e.CreatedAt,
            IsBestEntry = bestEntry != null && e.Id == bestEntry.Id
        }).ToList();

        return Ok(new UserEntriesResponseDto
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            LeaderboardPaid = user.LeaderboardPaid,
            QuizPaid = user.QuizPaid,
            CleanShaveImageUrl = user.CleanShaveImageUrl,
            CleanShaveUploadedAt = user.CleanShaveUploadedAt,
            TotalSubmissions = userEntries.Count,
            BestScore = bestEntry?.OverallScore ?? 0,
            LeaderboardRank = rank,
            Entries = entryDtos
        });
    }

    /// <summary>
    /// Retrieve a single mustache entry by its unique ID.
    /// </summary>
    [HttpGet("entry/{id:guid}")]
    [ProducesResponseType(typeof(JudgeResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEntryById(Guid id)
    {
        var entry = await _dbContext.MustacheEntries
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id && !e.IsHidden);

        if (entry == null)
        {
            return NotFound(new { error = "Mustache entry not found." });
        }

        return Ok(new JudgeResponseDto
        {
            Id = entry.Id,
            ContestantName = entry.ContestantName,
            ImageUrl = entry.ImageUrl,
            ThumbnailUrl = entry.ThumbnailUrl,
            CleanShaveImageUrl = entry.CleanShaveImageUrl,
            OverallScore = entry.OverallScore,
            DensityScore = entry.DensityScore,
            SymmetryScore = entry.SymmetryScore,
            SwaggerScore = entry.SwaggerScore,
            GrowthScore = entry.GrowthScore,
            GrowthAnalysis = entry.GrowthAnalysis,
            IsWoodenSpoon = entry.IsWoodenSpoon,
            WoodenSpoonReason = entry.WoodenSpoonReason,
            InnovationScore = entry.InnovationScore,
            DedicationScore = entry.DedicationScore,
            FunninessScore = entry.FunninessScore,
            MustacheTitle = entry.MustacheTitle,
            StyleCategory = entry.StyleCategory,
            Roast = entry.RoastCommentary,
            CelebrityTwin = entry.CelebrityTwin,
            VerdictBadge = entry.VerdictBadge,
            CreatedAt = entry.CreatedAt
        });
    }

    // ==========================================
    // ADMIN PORTAL ENDPOINTS
    // ==========================================

    private bool IsAdminAuthorized()
    {
        var configuredPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD")
                                 ?? _configuration["Admin:Password"];

        if (Request.Headers.TryGetValue("X-Admin-Password", out var headerPassword) &&
            !string.IsNullOrEmpty(configuredPassword) &&
            headerPassword == configuredPassword)
        {
            return true;
        }

        if (Request.Query.TryGetValue("password", out var queryPassword) &&
            !string.IsNullOrEmpty(configuredPassword) &&
            queryPassword == configuredPassword)
        {
            return true;
        }

        var authHeader = Request.Headers.Authorization.ToString();
        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();
            var payload = _tokenService.ValidateToken(token);
            if (payload != null && payload.Role == "Admin")
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Authenticate admin with password from env / config.
    /// </summary>
    [HttpPost("admin/login")]
    public IActionResult AdminLogin([FromBody] AdminLoginRequest request)
    {
        var configuredPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD")
                                 ?? _configuration["Admin:Password"];

        if (!string.IsNullOrEmpty(configuredPassword) && string.Equals(request.Password, configuredPassword))
        {
            return Ok(new { success = true, token = configuredPassword });
        }

        return Unauthorized(new { error = "Invalid admin password." });
    }

    /// <summary>
    /// List all entries (including hidden ones) with moderation controls.
    /// </summary>
    [HttpGet("admin/entries")]
    public async Task<IActionResult> GetAdminEntries()
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        var allEntries = await _dbContext.MustacheEntries
            .AsNoTracking()
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        var total = allEntries.Count;
        var visible = allEntries.Count(e => !e.IsHidden);
        var hidden = allEntries.Count(e => e.IsHidden);
        var championship = allEntries.Count(e => !e.IsWoodenSpoon);
        var woodenSpoon = allEntries.Count(e => e.IsWoodenSpoon);
        var avg = total > 0 ? Math.Round(allEntries.Average(e => e.OverallScore), 1) : 0;
        var top = total > 0 ? allEntries.Max(e => e.OverallScore) : 0;

        var entryDtos = allEntries.Select((e, idx) => new AdminEntryDto
        {
            Rank = idx + 1,
            Id = e.Id,
            ContestantName = e.ContestantName,
            ImageUrl = e.ImageUrl,
            ThumbnailUrl = e.ThumbnailUrl,
            CleanShaveImageUrl = e.CleanShaveImageUrl,
            OverallScore = e.OverallScore,
            DensityScore = e.DensityScore,
            SymmetryScore = e.SymmetryScore,
            SwaggerScore = e.SwaggerScore,
            GrowthScore = e.GrowthScore,
            GrowthAnalysis = e.GrowthAnalysis,
            IsWoodenSpoon = e.IsWoodenSpoon,
            WoodenSpoonReason = e.WoodenSpoonReason,
            InnovationScore = e.InnovationScore,
            DedicationScore = e.DedicationScore,
            FunninessScore = e.FunninessScore,
            MustacheTitle = e.MustacheTitle,
            StyleCategory = e.StyleCategory,
            Roast = e.RoastCommentary,
            CelebrityTwin = e.CelebrityTwin,
            VerdictBadge = e.VerdictBadge,
            CreatedAt = e.CreatedAt,
            IsHidden = e.IsHidden
        }).ToList();

        return Ok(new AdminOverviewDto
        {
            TotalSubmissions = total,
            VisibleCount = visible,
            HiddenCount = hidden,
            ChampionshipCount = championship,
            WoodenSpoonCount = woodenSpoon,
            AverageScore = avg,
            TopScore = top,
            RemainingAiQuota = _rateLimiter.GetRemainingRequests(),
            MaxAiQuotaPerMinute = _rateLimiter.MaxRequestsPerMinute,
            SecondsUntilQuotaReset = (int)Math.Ceiling(_rateLimiter.GetTimeUntilNextWindow().TotalSeconds),
            QueuedRequestsCount = _rateLimiter.QueuedRequestsCount,
            Entries = entryDtos
        });
    }

    /// <summary>
    /// List all registered contestants and their R100/R50 payment statuses for the admin payment management panel.
    /// </summary>
    [HttpGet("admin/contestants")]
    public async Task<IActionResult> GetAdminContestants()
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        var users = await _dbContext.Users
            .Include(u => u.Entries.Where(e => !e.IsHidden))
            .AsNoTracking()
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var contestantDtos = users.Select(u =>
        {
            var best = u.Entries.OrderByDescending(e => e.OverallScore).FirstOrDefault();
            return new ContestantSummaryDto(
                u.Id,
                u.Email,
                u.FullName,
                u.Role,
                u.LeaderboardPaid,
                u.QuizPaid,
                u.Entries.Count,
                best?.OverallScore ?? 0,
                best?.MustacheTitle,
                best?.ThumbnailUrl,
                u.CreatedAt,
                u.CleanShaveImageUrl,
                u.CleanShaveUploadedAt
            );
        }).ToList();

        var leaderboardPaidCount = users.Count(u => u.LeaderboardPaid);
        var quizPaidCount = users.Count(u => u.QuizPaid);
        var totalFunds = (leaderboardPaidCount * 100) + (quizPaidCount * 50);

        return Ok(new
        {
            totalContestants = users.Count,
            leaderboardPaidCount,
            quizPaidCount,
            totalFundsRaisedZar = totalFunds,
            contestants = contestantDtos
        });
    }

    /// <summary>
    /// Toggle or set a contestant's R100 Leaderboard fee payment status.
    /// </summary>
    [HttpPost("admin/contestant/{id:guid}/toggle-leaderboard-paid")]
    public async Task<IActionResult> ToggleLeaderboardPaid(Guid id, [FromBody] TogglePaymentRequest? req = null)
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        var user = await _dbContext.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "Contestant not found." });
        }

        user.LeaderboardPaid = req != null ? req.Paid : !user.LeaderboardPaid;
        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            userId = user.Id,
            fullName = user.FullName,
            leaderboardPaid = user.LeaderboardPaid,
            message = user.LeaderboardPaid
                ? $"{user.FullName}'s R100 Leaderboard fee approved! Their top mustache is now live on the public leaderboard."
                : $"{user.FullName}'s Leaderboard status set to unpaid."
        });
    }

    /// <summary>
    /// Toggle or set a contestant's R50 Quiz Arena fee payment status.
    /// </summary>
    [HttpPost("admin/contestant/{id:guid}/toggle-quiz-paid")]
    public async Task<IActionResult> ToggleQuizPaid(Guid id, [FromBody] TogglePaymentRequest? req = null)
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        var user = await _dbContext.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "Contestant not found." });
        }

        user.QuizPaid = req != null ? req.Paid : !user.QuizPaid;
        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            userId = user.Id,
            fullName = user.FullName,
            quizPaid = user.QuizPaid,
            message = user.QuizPaid
                ? $"{user.FullName}'s R50 Quiz pass approved! They can now enter the Quiz Arena."
                : $"{user.FullName}'s Quiz pass set to unpaid."
        });
    }

    /// <summary>
    /// Toggle visibility of a contestant's entry on the public leaderboard.
    /// </summary>
    [HttpPost("admin/entry/{id:guid}/toggle-hide")]
    public async Task<IActionResult> ToggleHideEntry(Guid id)
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        var entry = await _dbContext.MustacheEntries.FindAsync(id);
        if (entry == null)
        {
            return NotFound(new { error = "Entry not found." });
        }

        entry.IsHidden = !entry.IsHidden;
        await _dbContext.SaveChangesAsync();

        return Ok(new { id = entry.Id, isHidden = entry.IsHidden });
    }

    /// <summary>
    /// Toggle whether an entry belongs to the Wooden Spoon division or Championship division.
    /// </summary>
    [HttpPost("admin/entry/{id:guid}/toggle-woodenspoon")]
    public async Task<IActionResult> ToggleWoodenSpoon(Guid id)
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        var entry = await _dbContext.MustacheEntries.FindAsync(id);
        if (entry == null)
        {
            return NotFound(new { error = "Entry not found." });
        }

        entry.IsWoodenSpoon = !entry.IsWoodenSpoon;
        if (entry.IsWoodenSpoon && string.IsNullOrWhiteSpace(entry.WoodenSpoonReason))
        {
            entry.WoodenSpoonReason = "Reclassified by admin";
        }
        await _dbContext.SaveChangesAsync();

        return Ok(new { id = entry.Id, isWoodenSpoon = entry.IsWoodenSpoon, woodenSpoonReason = entry.WoodenSpoonReason });
    }

    /// <summary>
    /// Permanently delete an entry.
    /// </summary>
    [HttpDelete("admin/entry/{id:guid}")]
    public async Task<IActionResult> DeleteEntry(Guid id)
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        var entry = await _dbContext.MustacheEntries.FindAsync(id);
        if (entry == null)
        {
            return NotFound(new { error = "Entry not found." });
        }

        if (!string.IsNullOrWhiteSpace(entry.ImageUrl))
        {
            try
            {
                await _storageService.DeleteImageAsync(entry.ImageUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete storage image for {Id}", entry.Id);
            }
        }

        _dbContext.MustacheEntries.Remove(entry);
        await _dbContext.SaveChangesAsync();

        return Ok(new { success = true, message = "Entry deleted permanently." });
    }

    /// <summary>
    /// Permanently delete multiple selected entries.
    /// </summary>
    [HttpPost("admin/entries/bulk-delete")]
    public async Task<IActionResult> BulkDeleteEntries([FromBody] BulkDeleteRequestDto request)
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        if (request?.Ids == null || request.Ids.Count == 0)
        {
            return BadRequest(new { error = "No entry IDs provided for deletion." });
        }

        var entries = await _dbContext.MustacheEntries
            .Where(e => request.Ids.Contains(e.Id))
            .ToListAsync();

        if (entries.Count == 0)
        {
            return Ok(new { success = true, deletedCount = 0, message = "No matching entries found." });
        }

        foreach (var entry in entries)
        {
            if (!string.IsNullOrWhiteSpace(entry.ImageUrl))
            {
                try
                {
                    await _storageService.DeleteImageAsync(entry.ImageUrl);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete storage image {Url} for entry {Id}", entry.ImageUrl, entry.Id);
                }
            }
        }

        _dbContext.MustacheEntries.RemoveRange(entries);
        await _dbContext.SaveChangesAsync();

        return Ok(new { success = true, deletedCount = entries.Count, message = $"Successfully deleted {entries.Count} selected entries." });
    }

    /// <summary>
    /// Permanently delete all entries and clean up storage images.
    /// </summary>
    [HttpPost("admin/entries/delete-all")]
    public async Task<IActionResult> DeleteAllEntries()
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        var allEntries = await _dbContext.MustacheEntries.ToListAsync();
        var count = allEntries.Count;

        if (count == 0)
        {
            return Ok(new { success = true, deletedCount = 0, message = "Database is already empty." });
        }

        foreach (var entry in allEntries)
        {
            if (!string.IsNullOrWhiteSpace(entry.ImageUrl))
            {
                try
                {
                    await _storageService.DeleteImageAsync(entry.ImageUrl);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete storage image {Url} for entry {Id}", entry.ImageUrl, entry.Id);
                }
            }
        }

        _dbContext.MustacheEntries.RemoveRange(allEntries);
        await _dbContext.SaveChangesAsync();

        return Ok(new { success = true, deletedCount = count, message = $"All {count} entries have been permanently deleted." });
    }

    /// <summary>
    /// Helper to download or read local image bytes for re-analysis.
    /// </summary>
    private async Task<(byte[]? bytes, string contentType)> LoadImageBytesAsync(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return (null, "image/jpeg");

        if (imageUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            imageUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(25);
                var resp = await client.GetAsync(imageUrl);
                if (resp.IsSuccessStatusCode)
                {
                    var bytes = await resp.Content.ReadAsByteArrayAsync();
                    var ct = resp.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
                    return (bytes, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to download image from {Url}", imageUrl);
            }
            return (null, "image/jpeg");
        }

        // Local filesystem fallback
        var webRoot = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }
        var relative = imageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var localPath = Path.Combine(webRoot, relative);
        if (System.IO.File.Exists(localPath))
        {
            try
            {
                var bytes = await System.IO.File.ReadAllBytesAsync(localPath);
                var ext = Path.GetExtension(localPath).ToLowerInvariant();
                var ct = ext switch
                {
                    ".png" => "image/png",
                    ".webp" => "image/webp",
                    _ => "image/jpeg"
                };
                return (bytes, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read local file from {Path}", localPath);
            }
        }

        return (null, "image/jpeg");
    }

    /// <summary>
    /// Re-analyse selected entries using the Gemini AI judge, strictly respecting rate limits.
    /// </summary>
    [HttpPost("admin/entries/reanalyse")]
    public async Task<IActionResult> ReanalyseEntries([FromBody] ReanalyseRequestDto request, CancellationToken cancellationToken = default)
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        if (request?.Ids == null || request.Ids.Count == 0)
        {
            return BadRequest(new { error = "No entry IDs specified for re-analysis." });
        }

        var entries = await _dbContext.MustacheEntries
            .Where(e => request.Ids.Contains(e.Id))
            .ToListAsync();

        if (entries.Count == 0)
        {
            return NotFound(new { error = "None of the specified entries were found." });
        }

        var updatedEntries = new List<AdminEntryDto>();
        int reanalysedCount = 0;
        int rateLimitedCount = 0;
        string? rateLimitReason = null;

        foreach (var entry in entries)
        {
            // For bulk re-analysis of multiple entries, if quota is depleted, defer remainder
            // to avoid long HTTP blocking. Single-entry requests queue naturally.
            if (entries.Count > 1 && _rateLimiter.GetRemainingRequests() <= 0)
            {
                var waitTime = _rateLimiter.GetTimeUntilNextWindow();
                rateLimitedCount = entries.Count - reanalysedCount;
                rateLimitReason = $"Rate limit reached (max {_rateLimiter.MaxRequestsPerMinute} evaluations per minute). {reanalysedCount} re-analysed, {rateLimitedCount} deferred. Please wait {Math.Ceiling(waitTime.TotalSeconds)}s.";
                _logger.LogWarning("Bulk re-analysis stopped for remaining {Count} entries: {Reason}", rateLimitedCount, rateLimitReason);
                break;
            }

            var (imageBytes, contentType) = await LoadImageBytesAsync(entry.ImageUrl);
            if (imageBytes == null || imageBytes.Length == 0)
            {
                _logger.LogWarning("Cannot re-analyse entry {Id} ({Name}): image could not be loaded from {Url}", 
                    entry.Id, entry.ContestantName, entry.ImageUrl);
                continue;
            }

            try
            {
                using var aiStream = new MemoryStream(imageBytes);
                // GeminiJudgeService awaits _rateLimiter.AcquireAsync()
                var result = await _geminiService.JudgeMustacheAsync(
                    aiStream,
                    contentType,
                    entry.ContestantName,
                    cancellationToken: cancellationToken);

                if (InjectionDetector.IsInjectionAttempt(entry.ContestantName, out _) ||
                    result.WoodenSpoonReason == "Prompt / SQL Injection")
                {
                    InjectionDetector.ApplyWoodenSpoonInjectionVerdict(result);
                }

                entry.OverallScore = Math.Clamp(result.OverallScore, 0, 100);
                entry.DensityScore = Math.Clamp(result.DensityScore, 0, 10);
                entry.SymmetryScore = Math.Clamp(result.SymmetryScore, 0, 10);
                entry.SwaggerScore = Math.Clamp(result.SwaggerScore, 0, 10);
                entry.IsWoodenSpoon = result.IsWoodenSpoon;
                entry.WoodenSpoonReason = result.WoodenSpoonReason;
                entry.InnovationScore = Math.Clamp(result.InnovationScore, 0, 10);
                entry.DedicationScore = Math.Clamp(result.DedicationScore, 0, 10);
                entry.FunninessScore = Math.Clamp(result.FunninessScore, 0, 10);
                if (!string.IsNullOrWhiteSpace(result.MustacheTitle))
                    entry.MustacheTitle = result.MustacheTitle;
                if (!string.IsNullOrWhiteSpace(result.StyleCategory))
                    entry.StyleCategory = result.StyleCategory;
                if (!string.IsNullOrWhiteSpace(result.Roast))
                    entry.RoastCommentary = result.Roast;
                if (!string.IsNullOrWhiteSpace(result.CelebrityTwin))
                    entry.CelebrityTwin = result.CelebrityTwin;
                if (!string.IsNullOrWhiteSpace(result.VerdictBadge))
                    entry.VerdictBadge = result.VerdictBadge;

                reanalysedCount++;

                updatedEntries.Add(new AdminEntryDto
                {
                    Id = entry.Id,
                    ContestantName = entry.ContestantName,
                    ImageUrl = entry.ImageUrl,
                    ThumbnailUrl = entry.ThumbnailUrl,
                    OverallScore = entry.OverallScore,
                    DensityScore = entry.DensityScore,
                    SymmetryScore = entry.SymmetryScore,
                    SwaggerScore = entry.SwaggerScore,
                    IsWoodenSpoon = entry.IsWoodenSpoon,
                    WoodenSpoonReason = entry.WoodenSpoonReason,
                    InnovationScore = entry.InnovationScore,
                    DedicationScore = entry.DedicationScore,
                    FunninessScore = entry.FunninessScore,
                    MustacheTitle = entry.MustacheTitle,
                    StyleCategory = entry.StyleCategory,
                    Roast = entry.RoastCommentary,
                    CelebrityTwin = entry.CelebrityTwin,
                    VerdictBadge = entry.VerdictBadge,
                    CreatedAt = entry.CreatedAt,
                    IsHidden = entry.IsHidden
                });
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("rate limit") || ex.Message.Contains("high demand"))
            {
                var waitTime = _rateLimiter.GetTimeUntilNextWindow();
                rateLimitedCount = entries.Count - reanalysedCount;
                rateLimitReason = $"Rate limit reached: {ex.Message}";
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during re-analysis of entry {Id}", entry.Id);
            }
        }

        if (reanalysedCount > 0)
        {
            await _dbContext.SaveChangesAsync();
        }

        var remainingSeconds = (int)Math.Ceiling(_rateLimiter.GetTimeUntilNextWindow().TotalSeconds);
        var remainingQuota = _rateLimiter.GetRemainingRequests();

        if (reanalysedCount == 0 && rateLimitedCount > 0)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new ReanalyseResponseDto
            {
                Success = false,
                ReanalysedCount = 0,
                SkippedDueToRateLimit = rateLimitedCount,
                Message = rateLimitReason ?? $"Rate limit reached (maximum {_rateLimiter.MaxRequestsPerMinute} AI evaluations per minute). Please wait before trying again.",
                RemainingRequests = remainingQuota,
                SecondsUntilReset = remainingSeconds,
                UpdatedEntries = updatedEntries
            });
        }

        return Ok(new ReanalyseResponseDto
        {
            Success = true,
            ReanalysedCount = reanalysedCount,
            SkippedDueToRateLimit = rateLimitedCount,
            Message = rateLimitedCount > 0
                ? $"Re-analysed {reanalysedCount} entries. {rateLimitedCount} were deferred because the AI rate limit ({_rateLimiter.MaxRequestsPerMinute}/min) was reached. Try again in {remainingSeconds}s."
                : $"Successfully re-analysed {reanalysedCount} {(reanalysedCount == 1 ? "entry" : "entries")}.",
            RemainingRequests = remainingQuota,
            SecondsUntilReset = remainingSeconds,
            UpdatedEntries = updatedEntries
        });
    }

    /// <summary>
    /// Re-analyse a single entry by ID, respecting rate limiter queue.
    /// </summary>
    [HttpPost("admin/entry/{id:guid}/reanalyse")]
    public async Task<IActionResult> ReanalyseSingleEntry(Guid id, CancellationToken cancellationToken = default)
    {
        return await ReanalyseEntries(new ReanalyseRequestDto { Ids = new List<Guid> { id } }, cancellationToken);
    }
}
