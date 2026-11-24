using DvtMustacheJudge.Api.Controllers;
using DvtMustacheJudge.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DvtMustacheJudge.Api.Services;

public class JudgingRetryBackgroundWorker : BackgroundService
{
    private readonly IJudgingRetryService _retryService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<JudgingRetryBackgroundWorker> _logger;

    public JudgingRetryBackgroundWorker(
        IJudgingRetryService retryService,
        IServiceScopeFactory scopeFactory,
        IWebHostEnvironment environment,
        ILogger<JudgingRetryBackgroundWorker> logger)
    {
        _retryService = retryService;
        _scopeFactory = scopeFactory;
        _environment = environment;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("JudgingRetryBackgroundWorker started. Monitoring queued Gemini judging attempts.");

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await ProcessDueAttemptsAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("JudgingRetryBackgroundWorker stopping.");
        }
    }

    public async Task<int> ProcessDueAttemptsAsync(CancellationToken cancellationToken = default)
    {
        var dueAttempts = _retryService.GetDueAttempts(DateTime.UtcNow);
        if (dueAttempts.Count == 0)
        {
            return 0;
        }

        int processedCount = 0;

        foreach (var attempt in dueAttempts)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var geminiService = scope.ServiceProvider.GetRequiredService<IGeminiJudgeService>();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var entry = await dbContext.MustacheEntries
                    .FirstOrDefaultAsync(e => e.Id == attempt.EntryId, cancellationToken);

                if (entry == null)
                {
                    _logger.LogWarning("Queued entry {EntryId} no longer exists in database. Removing from retry queue.", attempt.EntryId);
                    _retryService.MarkCompleted(attempt.EntryId);
                    continue;
                }

                var imageUrl = !string.IsNullOrWhiteSpace(attempt.ImageUrl) ? attempt.ImageUrl : entry.ImageUrl;
                var (imageBytes, loadedMime) = await LoadImageBytesAsync(imageUrl, cancellationToken);
                if (imageBytes == null || imageBytes.Length == 0)
                {
                    _logger.LogWarning("Could not load image from {Url} for queued entry {EntryId}. Removing from retry queue.", imageUrl, attempt.EntryId);
                    _retryService.MarkCompleted(attempt.EntryId);
                    continue;
                }

                var cleanShaveUrl = !string.IsNullOrWhiteSpace(attempt.CleanShaveImageUrl)
                    ? attempt.CleanShaveImageUrl
                    : entry.CleanShaveImageUrl;

                byte[]? cleanShaveBytes = null;
                string? cleanShaveMime = attempt.CleanShaveMimeType;
                if (!string.IsNullOrWhiteSpace(cleanShaveUrl))
                {
                    var loadedCs = await LoadImageBytesAsync(cleanShaveUrl, cancellationToken);
                    cleanShaveBytes = loadedCs.bytes;
                    cleanShaveMime ??= loadedCs.contentType;
                }

                using var imageStream = new MemoryStream(imageBytes);
                using var cleanShaveStream = cleanShaveBytes != null
                    ? new MemoryStream(cleanShaveBytes)
                    : null;

                var judgeResult = await geminiService.JudgeMustacheAsync(
                    imageStream,
                    !string.IsNullOrWhiteSpace(attempt.ImageMimeType) ? attempt.ImageMimeType : loadedMime,
                    attempt.ContestantName,
                    cleanShaveStream,
                    cleanShaveMime,
                    attempt.CompetitionType,
                    cancellationToken);

                bool isCreative = string.Equals(attempt.CompetitionType, "CreativeMustache", StringComparison.OrdinalIgnoreCase);

                if (!judgeResult.IsAppropriate)
                {
                    _logger.LogWarning(
                        "Background retry Gemini assessment flagged entry {EntryId} ('{Name}') as inappropriate: {Reason}. Hiding entry.",
                        attempt.EntryId,
                        attempt.ContestantName,
                        judgeResult.InappropriateReason);

                    entry.IsHidden = true;
                    entry.RoastCommentary = judgeResult.InappropriateReason ?? "Flagged by content safety inspection.";
                }
                else
                {
                    bool hasCleanShave = cleanShaveBytes != null || !string.IsNullOrWhiteSpace(entry.CleanShaveImageUrl);

                    entry.OverallScore = Math.Clamp(judgeResult.OverallScore, 0, 100);
                    entry.DensityScore = Math.Clamp(judgeResult.DensityScore, 0, 10);
                    entry.SymmetryScore = Math.Clamp(judgeResult.SymmetryScore, 0, 10);
                    entry.SwaggerScore = Math.Clamp(judgeResult.SwaggerScore, 0, 10);
                    entry.GrowthScore = judgeResult.GrowthScore > 0
                        ? Math.Clamp(judgeResult.GrowthScore, 0, 100)
                        : (hasCleanShave ? Math.Clamp(judgeResult.OverallScore, 10, 100) : 0);
                    entry.GrowthAnalysis = !string.IsNullOrWhiteSpace(judgeResult.GrowthAnalysis)
                        ? judgeResult.GrowthAnalysis
                        : (hasCleanShave ? $"Measured transformation from Day 1 Clean Shave! Growth progressed into a solid {judgeResult.StyleCategory}." : null);
                    entry.IsSamePerson = judgeResult.IsSamePerson;
                    entry.IdentityMatchReason = judgeResult.IdentityMatchReason;
                    entry.InnovationScore = Math.Clamp(judgeResult.InnovationScore, 0, 10);
                    entry.DedicationScore = Math.Clamp(judgeResult.DedicationScore, 0, 10);
                    entry.FunninessScore = Math.Clamp(judgeResult.FunninessScore, 0, 10);
                    entry.MustacheTitle = string.IsNullOrWhiteSpace(judgeResult.MustacheTitle)
                        ? (isCreative ? "The Crafty Maestro" : (judgeResult.OverallScore == 0 ? "Follicle 404" : "The Bristle Contender"))
                        : judgeResult.MustacheTitle;
                    entry.StyleCategory = string.IsNullOrWhiteSpace(judgeResult.StyleCategory)
                        ? "Other"
                        : judgeResult.StyleCategory;
                    entry.RoastCommentary = judgeResult.Roast ?? entry.RoastCommentary;
                    entry.CelebrityTwin = judgeResult.CelebrityTwin ?? entry.CelebrityTwin;
                    entry.VerdictBadge = string.IsNullOrWhiteSpace(judgeResult.VerdictBadge)
                        ? (isCreative ? "Craft Follicle Hero" : (judgeResult.OverallScore == 0 ? "Zero-Bristle Deficit" : "Certified Movember Hero"))
                        : judgeResult.VerdictBadge;
                }

                await dbContext.SaveChangesAsync(cancellationToken);
                MustacheController.InvalidateLeaderboardCache();
                _retryService.MarkCompleted(attempt.EntryId);
                processedCount++;
            }
            catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
            {
                _retryService.ScheduleNextRetry(attempt.EntryId, ex.Message);
            }
        }

        return processedCount;
    }

    private async Task<(byte[]? bytes, string contentType)> LoadImageBytesAsync(string imageUrl, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return (null, "image/jpeg");
        }

        var webRoot = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        try
        {
            string fileName = Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri)
                ? Path.GetFileName(uri.LocalPath)
                : Path.GetFileName(imageUrl.TrimStart('/'));

            if (!string.IsNullOrWhiteSpace(fileName))
            {
                var inUploadsPath = Path.Combine(webRoot, "uploads", fileName);
                var directPath = Path.Combine(webRoot, fileName);
                var targetPath = File.Exists(inUploadsPath) ? inUploadsPath : (File.Exists(directPath) ? directPath : null);

                if (targetPath != null)
                {
                    var bytes = await File.ReadAllBytesAsync(targetPath, cancellationToken);
                    var ext = Path.GetExtension(targetPath).ToLowerInvariant();
                    var ct = ext switch
                    {
                        ".png" => "image/png",
                        ".webp" => "image/webp",
                        _ => "image/jpeg"
                    };
                    return (bytes, ct);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed local filesystem lookup for {Url}", imageUrl);
        }

        if (imageUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            imageUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(25) };
                var resp = await client.GetAsync(imageUrl, cancellationToken);
                if (resp.IsSuccessStatusCode)
                {
                    var bytes = await resp.Content.ReadAsByteArrayAsync(cancellationToken);
                    var ct = resp.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
                    return (bytes, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed remote image download from {Url}", imageUrl);
            }
        }

        return (null, "image/jpeg");
    }
}
