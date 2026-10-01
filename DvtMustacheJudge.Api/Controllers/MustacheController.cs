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
    private readonly IConfiguration _configuration;
    private readonly ILogger<MustacheController> _logger;

    public MustacheController(
        AppDbContext dbContext,
        IImageStorageService storageService,
        IGeminiJudgeService geminiService,
        IConfiguration configuration,
        ILogger<MustacheController> logger)
    {
        _dbContext = dbContext;
        _storageService = storageService;
        _geminiService = geminiService;
        _configuration = configuration;
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
    public async Task<IActionResult> Judge([FromForm] JudgeRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length < 2)
        {
            return BadRequest(new { error = "Contestant name is required and must be at least 2 characters." });
        }

        if (request.Name.Length > 50)
        {
            return BadRequest(new { error = "Contestant name must not exceed 50 characters." });
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
            var contestantName = request.Name.Trim();
            var location = request.GetResolvedLocation();

            // Read image into a reusable byte array to avoid stream disposal conflicts
            byte[] imageBytes;
            using (var memoryStream = new MemoryStream())
            {
                await request.Image.CopyToAsync(memoryStream);
                imageBytes = memoryStream.ToArray();
            }

            // 1. Upload image to storage
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

            // 2. Call Gemini AI judge
            GeminiJudgeResult judgeResult;
            using (var aiStream = new MemoryStream(imageBytes))
            {
                judgeResult = await _geminiService.JudgeMustacheAsync(
                    aiStream,
                    request.Image.ContentType,
                    contestantName,
                    location);
            }

            // 3. Save entry to database
            var entry = new MustacheEntry
            {
                Id = Guid.NewGuid(),
                ContestantName = contestantName,
                OfficeLocation = location,
                ImageUrl = imageUrl,
                ThumbnailUrl = thumbnailUrl,
                OverallScore = Math.Clamp(judgeResult.OverallScore, 0, 100),
                DensityScore = Math.Clamp(judgeResult.DensityScore, 0, 10),
                SymmetryScore = Math.Clamp(judgeResult.SymmetryScore, 0, 10),
                SwaggerScore = Math.Clamp(judgeResult.SwaggerScore, 0, 10),
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
                IsHidden = false
            };

            _dbContext.MustacheEntries.Add(entry);
            await _dbContext.SaveChangesAsync();

            var responseDto = new JudgeResponseDto
            {
                Id = entry.Id,
                ContestantName = entry.ContestantName,
                OfficeLocation = entry.OfficeLocation,
                ImageUrl = entry.ImageUrl,
                ThumbnailUrl = entry.ThumbnailUrl,
                OverallScore = entry.OverallScore,
                DensityScore = entry.DensityScore,
                SymmetryScore = entry.SymmetryScore,
                SwaggerScore = entry.SwaggerScore,
                MustacheTitle = entry.MustacheTitle,
                StyleCategory = entry.StyleCategory,
                Roast = entry.RoastCommentary,
                CelebrityTwin = entry.CelebrityTwin,
                VerdictBadge = entry.VerdictBadge,
                CreatedAt = entry.CreatedAt
            };

            return Ok(responseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error judging mustache for {Name}: {Message}", request.Name, ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Retrieve the live leaderboard.
    /// </summary>
    [HttpGet("leaderboard")]
    [ProducesResponseType(typeof(LeaderboardResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLeaderboard([FromQuery] int limit = 50, [FromQuery] string? category = null)
    {
        if (limit <= 0) limit = 50;
        if (limit > 200) limit = 200;

        var query = _dbContext.MustacheEntries
            .AsNoTracking()
            .Where(e => !e.IsHidden);

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(e => e.StyleCategory.ToLower() == category.ToLower());
        }

        var totalEntries = await query.CountAsync();

        var entries = await query
            .OrderByDescending(e => e.OverallScore)
            .ThenByDescending(e => e.CreatedAt)
            .Take(limit)
            .Select(e => new LeaderboardEntryDto
            {
                Id = e.Id,
                ContestantName = e.ContestantName,
                OfficeLocation = e.OfficeLocation,
                ImageUrl = e.ImageUrl,
                ThumbnailUrl = e.ThumbnailUrl,
                OverallScore = e.OverallScore,
                DensityScore = e.DensityScore,
                SymmetryScore = e.SymmetryScore,
                SwaggerScore = e.SwaggerScore,
                MustacheTitle = e.MustacheTitle,
                StyleCategory = e.StyleCategory,
                Roast = e.RoastCommentary,
                CelebrityTwin = e.CelebrityTwin,
                VerdictBadge = e.VerdictBadge,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync();

        for (int i = 0; i < entries.Count; i++)
        {
            entries[i].Rank = i + 1;
        }

        return Ok(new LeaderboardResponseDto
        {
            TotalEntries = totalEntries,
            Entries = entries
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
            OfficeLocation = entry.OfficeLocation,
            ImageUrl = entry.ImageUrl,
            ThumbnailUrl = entry.ThumbnailUrl,
            OverallScore = entry.OverallScore,
            DensityScore = entry.DensityScore,
            SymmetryScore = entry.SymmetryScore,
            SwaggerScore = entry.SwaggerScore,
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
                                 ?? _configuration["Admin:Password"]
                                 ?? "dvt-movember-admin-2026";

        if (Request.Headers.TryGetValue("X-Admin-Password", out var headerPassword) &&
            headerPassword == configuredPassword)
        {
            return true;
        }

        if (Request.Query.TryGetValue("password", out var queryPassword) &&
            queryPassword == configuredPassword)
        {
            return true;
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
                                 ?? _configuration["Admin:Password"]
                                 ?? "dvt-movember-admin-2026";

        if (string.Equals(request.Password, configuredPassword))
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
        var avg = total > 0 ? Math.Round(allEntries.Average(e => e.OverallScore), 1) : 0;
        var top = total > 0 ? allEntries.Max(e => e.OverallScore) : 0;

        var entryDtos = allEntries.Select((e, idx) => new AdminEntryDto
        {
            Rank = idx + 1,
            Id = e.Id,
            ContestantName = e.ContestantName,
            OfficeLocation = e.OfficeLocation,
            ImageUrl = e.ImageUrl,
            ThumbnailUrl = e.ThumbnailUrl,
            OverallScore = e.OverallScore,
            DensityScore = e.DensityScore,
            SymmetryScore = e.SymmetryScore,
            SwaggerScore = e.SwaggerScore,
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
            AverageScore = avg,
            TopScore = top,
            Entries = entryDtos
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

        _dbContext.MustacheEntries.Remove(entry);
        await _dbContext.SaveChangesAsync();

        return Ok(new { success = true, message = "Entry deleted permanently." });
    }
}
