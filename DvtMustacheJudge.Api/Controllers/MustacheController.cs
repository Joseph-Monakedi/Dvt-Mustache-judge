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
            ArgumentNullException.ThrowIfNull(user);

            var contestantName = !string.IsNullOrWhiteSpace(request.Name) ? request.Name.Trim() : user.FullName;

            var isUserCreative = user != null && (
                string.Equals(user.PreferredCompetition, "CreativeMustache", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(user.PreferredCompetition, "CrazyHair", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(user.PreferredCompetition, "Creative", StringComparison.OrdinalIgnoreCase));

            var isRequestCreative = !string.IsNullOrWhiteSpace(request.CompetitionType) && (
                string.Equals(request.CompetitionType, "CreativeMustache", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(request.CompetitionType, "Creative", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(request.CompetitionType, "CrazyHair", StringComparison.OrdinalIgnoreCase));

            // Default to Creative if explicitly requested, or if user's account preference is Creative and they didn't explicitly submit as a natural grower with a clean shave
            bool isCreative = isRequestCreative || (isUserCreative && (string.IsNullOrWhiteSpace(request.CompetitionType) || !string.Equals(request.CompetitionType, "Mustache", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(user.CleanShaveImageUrl)));
            var competitionType = isCreative ? "CreativeMustache" : "Mustache";

            string? cleanShaveUrl = user.CleanShaveImageUrl;
            byte[]? cleanShaveBytes = null;
            string? cleanShaveMime = null;

            // Check if contestant submitted a clean shave baseline image in this request (only relevant for mustache growers)
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

            // Gating: Natural mustache growers MUST have a Day 1 clean shave photo saved
            if (!isCreative && string.IsNullOrWhiteSpace(cleanShaveUrl))
            {
                return BadRequest(new { error = "You must first take and submit your Day 1 Clean Shave baseline photo before entering mustache contest photos." });
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
                    competitionType,
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

                var finalCompetitionType = (isCreative || judgeResult.IsWoodenSpoon || isUserCreative) ? "CreativeMustache" : "Mustache";

                // 5. Save entry to database
                var entry = new MustacheEntry
                {
                    Id = Guid.NewGuid(),
                    ContestantName = contestantName,
                    ImageUrl = imageUrl,
                    ThumbnailUrl = thumbnailUrl,
                    CleanShaveImageUrl = cleanShaveUrl,
                    CompetitionType = finalCompetitionType,
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
                        ? ((isCreative || judgeResult.IsWoodenSpoon) ? "The Crafty Maestro" : (judgeResult.OverallScore == 0 ? "Follicle 404" : "The Bristle Contender"))
                        : judgeResult.MustacheTitle,
                    StyleCategory = string.IsNullOrWhiteSpace(judgeResult.StyleCategory)
                        ? "Other"
                        : judgeResult.StyleCategory,
                    RoastCommentary = judgeResult.Roast,
                    CelebrityTwin = judgeResult.CelebrityTwin,
                    VerdictBadge = string.IsNullOrWhiteSpace(judgeResult.VerdictBadge)
                        ? ((isCreative || judgeResult.IsWoodenSpoon) ? "Craft Follicle Hero" : (judgeResult.OverallScore == 0 ? "Zero-Bristle Deficit" : "Certified Movember Hero"))
                        : judgeResult.VerdictBadge,
                    CreatedAt = DateTime.UtcNow,
                    IsHidden = false,
                    UserId = authenticatedUserId
                };

                _dbContext.MustacheEntries.Add(entry);
                await _dbContext.SaveChangesAsync();

                var higherScoreExists = await _dbContext.MustacheEntries
                    .AnyAsync(e => e.UserId == authenticatedUserId.Value && e.Id != entry.Id && !e.IsHidden && e.CompetitionType == finalCompetitionType && e.OverallScore > entry.OverallScore);
                bool isBest = !higherScoreExists;

                var responseDto = new JudgeResponseDto
                {
                    Id = entry.Id,
                    ContestantName = entry.ContestantName,
                    ImageUrl = entry.ImageUrl,
                    ThumbnailUrl = entry.ThumbnailUrl,
                    CleanShaveImageUrl = entry.CleanShaveImageUrl,
                    CompetitionType = entry.CompetitionType,
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
                    IsLeaderboardEligible = true,
                    IsPrizeEligible = user.IsEligibleToWin,
                    AmountDonated = user.AmountPaid ?? 0m,
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
    /// Open to all contestants. Donated contestants (R100+) are marked as prize-eligible.
    /// </summary>
    [HttpGet("leaderboard")]
    [ProducesResponseType(typeof(LeaderboardResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLeaderboard(
        [FromQuery] int limit = 50,
        [FromQuery] string? category = null,
        [FromQuery] string division = "mustache")
    {
        if (limit <= 0) limit = 50;
        if (limit > 200) limit = 200;

        var isCreative = string.Equals(division, "creative", StringComparison.OrdinalIgnoreCase)
                      || string.Equals(division, "creativemustache", StringComparison.OrdinalIgnoreCase)
                      || string.Equals(division, "crazyhair", StringComparison.OrdinalIgnoreCase)
                      || string.Equals(division, "hair", StringComparison.OrdinalIgnoreCase);

        var allVisible = await _dbContext.MustacheEntries
            .Include(e => e.User)
            .AsNoTracking()
            .Where(e => !e.IsHidden)
            .ToListAsync();

        // Calculate competition division counts (deduplicated by contestant: top scoring entry per contestant)
        var mustacheCount = allVisible
            .Where(e => !IsCreativeEntry(e))
            .GroupBy(e => e.UserId.HasValue ? e.UserId.Value.ToString() : e.Id.ToString())
            .Count();

        var creativeCount = allVisible
            .Where(e => IsCreativeEntry(e))
            .GroupBy(e => e.UserId.HasValue ? e.UserId.Value.ToString() : e.Id.ToString())
            .Count();

        var divisionEntries = isCreative
            ? allVisible.Where(e => IsCreativeEntry(e)).ToList()
            : allVisible.Where(e => !IsCreativeEntry(e)).ToList();

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
                CompetitionType = e.CompetitionType,
                IsPrizeEligible = e.User != null && (e.User.LeaderboardPaid || e.User.AmountPaid >= 100),
                AmountDonated = e.User?.AmountPaid ?? 0m,
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
            MustacheEntriesCount = mustacheCount,
            CreativeMustacheEntriesCount = creativeCount,
            CrazyHairEntriesCount = creativeCount,
            ChampionshipEntriesCount = mustacheCount,
            WoodenSpoonEntriesCount = 0,
            Division = isCreative ? "creative" : "mustache",
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

        // Calculate user's rank on the live competition leaderboard
        int? rank = null;
        if (bestEntry != null)
        {
            bool isBestCreative = IsCreativeEntry(bestEntry);
            var allDivisionEntries = await _dbContext.MustacheEntries
                .Include(e => e.User)
                .AsNoTracking()
                .Where(e => !e.IsHidden)
                .ToListAsync();

            var topPerUser = allDivisionEntries
                .Where(e => IsCreativeEntry(e) == isBestCreative)
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
            CompetitionType = e.CompetitionType,
            IsPrizeEligible = user.IsEligibleToWin,
            AmountDonated = user.AmountPaid ?? 0m,
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
            IsPrizeEligible = user.IsEligibleToWin,
            AmountDonated = user.AmountPaid ?? 0m,
            PreferredCompetition = user.PreferredCompetition ?? "Mustache",
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
            .Include(e => e.User)
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
            CompetitionType = entry.CompetitionType,
            IsPrizeEligible = entry.User != null && (entry.User.LeaderboardPaid || entry.User.AmountPaid >= 100),
            AmountDonated = entry.User?.AmountPaid ?? 0m,
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
            .Include(e => e.User)
            .AsNoTracking()
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        var total = allEntries.Count;
        var visible = allEntries.Count(e => !e.IsHidden);
        var hidden = allEntries.Count(e => e.IsHidden);
        var mustacheCount = allEntries.Count(e => !IsCreativeEntry(e));
        var creativeCount = allEntries.Count(e => IsCreativeEntry(e));
        var championship = allEntries.Count(e => !e.IsWoodenSpoon);
        var woodenSpoon = allEntries.Count(e => e.IsWoodenSpoon);
        var prizeEligible = allEntries.Count(e => e.User != null && (e.User.LeaderboardPaid || (e.User.AmountPaid.HasValue && e.User.AmountPaid.Value >= 100)));
        var totalDonations = await _dbContext.Users.SumAsync(u => u.AmountPaid ?? 0m);
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
            CompetitionType = e.CompetitionType,
            IsPrizeEligible = e.User != null && (e.User.LeaderboardPaid || (e.User.AmountPaid.HasValue && e.User.AmountPaid.Value >= 100)),
            AmountDonated = e.User?.AmountPaid ?? 0m,
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
            MustacheCount = mustacheCount,
            CreativeMustacheCount = creativeCount,
            CrazyHairCount = creativeCount,
            ChampionshipCount = championship,
            WoodenSpoonCount = woodenSpoon,
            PrizeEligibleCount = prizeEligible,
            TotalDonations = totalDonations,
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
    /// List all registered contestants and their donation / prize eligibility statuses for the admin panel.
    /// </summary>
    [HttpGet("admin/contestants")]
    public async Task<IActionResult> GetAdminContestants()
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        var users = await _dbContext.Users
            .Where(u => u.Role != "Admin" 
                     && u.Email.ToLower() != "admin@dvt.co.za" 
                     && u.FullName.ToLower() != "movember admin" 
                     && !u.FullName.ToLower().Contains("alex movember")
                     && u.Email.ToLower() != "testparticipant@gmail.com")
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
                u.CleanShaveUploadedAt,
                u.PaymentMethod,
                u.PreferredCompetition ?? "Mustache",
                u.AmountPaid
            );
        }).ToList();

        var prizeEligibleCount = users.Count(u => u.IsEligibleToWin);
        var totalDonations = users.Sum(u => u.AmountPaid ?? 0m);

        var mustacheContestants = users.Count(u => u.PreferredCompetition != "CreativeMustache" && u.PreferredCompetition != "CrazyHair");
        var creativeContestants = users.Count(u => u.PreferredCompetition == "CreativeMustache" || u.PreferredCompetition == "CrazyHair");

        return Ok(new
        {
            totalContestants = users.Count,
            leaderboardPaidCount = prizeEligibleCount,
            quizPaidCount = 0,
            eligibleContestantsCount = prizeEligibleCount,
            mustacheContestantsCount = mustacheContestants,
            creativeMustacheContestantsCount = creativeContestants,
            crazyHairContestantsCount = creativeContestants,
            totalFundsRaisedZar = totalDonations,
            totalDonationsZar = totalDonations,
            contestants = contestantDtos
        });
    }

    /// <summary>
    /// Set a contestant's donation amount and prize eligibility.
    /// </summary>
    [HttpPost("admin/contestant/{id:guid}/set-donation")]
    public async Task<IActionResult> SetContestantDonation(Guid id, [FromBody] SetDonationRequest request)
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

        user.LeaderboardPaid = request.Eligible;
        if (request.Amount.HasValue)
        {
            user.AmountPaid = request.Amount.Value;
            if (user.AmountPaid >= 100)
            {
                user.LeaderboardPaid = true;
            }
        }
        else if (request.Eligible && user.AmountPaid < 100)
        {
            user.AmountPaid = 100m;
        }

        if (user.LeaderboardPaid && string.IsNullOrEmpty(user.PaymentMethod))
        {
            user.PaymentMethod = "DonationConfirmed";
            user.PaidAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            userId = user.Id,
            fullName = user.FullName,
            leaderboardPaid = user.LeaderboardPaid,
            amountPaid = user.AmountPaid,
            isEligibleToWin = user.IsEligibleToWin,
            message = $"Contestant {user.FullName} marked as {(user.IsEligibleToWin ? "Eligible to Win" : "Community Participant")} (Donated: R{user.AmountPaid})."
        });
    }

    /// <summary>
    /// Permanently delete a contestant account and all associated submissions/quiz scores.
    /// </summary>
    [HttpDelete("admin/contestant/{id:guid}")]
    public async Task<IActionResult> DeleteContestantAccount(Guid id)
    {
        if (!IsAdminAuthorized())
        {
            return Unauthorized(new { error = "Admin authorization required." });
        }

        var user = await _dbContext.Users
            .Include(u => u.Entries)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(new { error = "Contestant not found." });
        }

        if (user.Role == "Admin")
        {
            return BadRequest(new { error = "Admin accounts cannot be deleted." });
        }

        // Delete associated entry photos from storage if available
        foreach (var entry in user.Entries)
        {
            try
            {
                await _storageService.DeleteImageAsync(entry.ImageUrl);
                if (!string.IsNullOrWhiteSpace(entry.ThumbnailUrl))
                {
                    await _storageService.DeleteImageAsync(entry.ThumbnailUrl);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete storage image for entry {EntryId}", entry.Id);
            }
        }

        if (!string.IsNullOrWhiteSpace(user.CleanShaveImageUrl))
        {
            try
            {
                await _storageService.DeleteImageAsync(user.CleanShaveImageUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete clean shave image for user {UserId}", user.Id);
            }
        }

        _dbContext.MustacheEntries.RemoveRange(user.Entries);
        _dbContext.Users.Remove(user);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Admin permanently deleted contestant account {UserId} ({Email}).", user.Id, user.Email);

        return Ok(new
        {
            success = true,
            message = $"Contestant {user.FullName} ({user.Email}) and all their entries have been permanently deleted."
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
        if (user.LeaderboardPaid && string.IsNullOrEmpty(user.PaymentMethod))
        {
            user.PaymentMethod = "ManualAdmin";
            user.PaidAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            userId = user.Id,
            fullName = user.FullName,
            leaderboardPaid = user.LeaderboardPaid,
            paymentMethod = user.PaymentMethod,
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
        if (user.QuizPaid && string.IsNullOrEmpty(user.PaymentMethod))
        {
            user.PaymentMethod = "ManualAdmin";
            user.PaidAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            userId = user.Id,
            fullName = user.FullName,
            quizPaid = user.QuizPaid,
            paymentMethod = user.PaymentMethod,
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
        entry.CompetitionType = entry.IsWoodenSpoon ? "CreativeMustache" : "Mustache";
        if (entry.IsWoodenSpoon && string.IsNullOrWhiteSpace(entry.WoodenSpoonReason))
        {
            entry.WoodenSpoonReason = "Creative Mustache";
        }
        await _dbContext.SaveChangesAsync();

        return Ok(new { id = entry.Id, isWoodenSpoon = entry.IsWoodenSpoon, competitionType = entry.CompetitionType, woodenSpoonReason = entry.WoodenSpoonReason });
    }

    /// <summary>
    /// Permanently delete an entry owned by the authenticated participant.
    /// </summary>
    [HttpDelete("my-entry/{id:guid}")]
    public async Task<IActionResult> DeleteMyEntry(Guid id)
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
            return Unauthorized(new { error = "Please log in to delete your submission." });
        }

        var entry = await _dbContext.MustacheEntries.FindAsync(id);
        if (entry == null)
        {
            return NotFound(new { error = "Submission not found." });
        }

        // Only the owner of the entry (or an admin) can delete it
        if (entry.UserId != payload.UserId && !string.Equals(payload.Role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = "You are not authorized to delete another contestant's submission." });
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

        if (!string.IsNullOrWhiteSpace(entry.ThumbnailUrl) && entry.ThumbnailUrl != entry.ImageUrl)
        {
            try
            {
                await _storageService.DeleteImageAsync(entry.ThumbnailUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete thumbnail storage image for {Id}", entry.Id);
            }
        }

        _dbContext.MustacheEntries.Remove(entry);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Participant {UserId} permanently deleted submission {EntryId}.", payload.UserId, id);

        return Ok(new
        {
            success = true,
            message = "Submission deleted permanently.",
            deletedEntryId = id
        });
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

    /// <summary>
    /// Helper to identify whether an entry belongs to the Creative Mustache Challenge division.
    /// Includes faux mustaches, wooden spoon submissions, craft props, or entries tagged with Creative/Hair division.
    /// </summary>
    private static bool IsCreativeEntry(MustacheEntry e)
    {
        if (e.IsWoodenSpoon) return true;
        if (!string.IsNullOrWhiteSpace(e.CompetitionType))
        {
            var ct = e.CompetitionType.Trim();
            if (ct.Equals("CreativeMustache", StringComparison.OrdinalIgnoreCase) ||
                ct.Equals("Creative", StringComparison.OrdinalIgnoreCase) ||
                ct.Equals("CrazyHair", StringComparison.OrdinalIgnoreCase) ||
                ct.Contains("creative", StringComparison.OrdinalIgnoreCase) ||
                ct.Contains("hair", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        if (e.User != null && !string.IsNullOrWhiteSpace(e.User.PreferredCompetition))
        {
            var pc = e.User.PreferredCompetition.Trim();
            if (pc.Equals("CreativeMustache", StringComparison.OrdinalIgnoreCase) ||
                pc.Equals("Creative", StringComparison.OrdinalIgnoreCase) ||
                pc.Equals("CrazyHair", StringComparison.OrdinalIgnoreCase) ||
                pc.Contains("creative", StringComparison.OrdinalIgnoreCase) ||
                pc.Contains("hair", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }
}
