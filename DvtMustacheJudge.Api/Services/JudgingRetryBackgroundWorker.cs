using DvtMustacheJudge.Api.Controllers;
using DvtMustacheJudge.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace DvtMustacheJudge.Api.Services;

public class JudgingRetryBackgroundWorker : BackgroundService
{
    private readonly IJudgingRetryService _retryService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<JudgingRetryBackgroundWorker> _logger;

    public JudgingRetryBackgroundWorker(
        IJudgingRetryService retryService,
        IServiceScopeFactory scopeFactory,
        ILogger<JudgingRetryBackgroundWorker> logger)
    {
        _retryService = retryService;
        _scopeFactory = scopeFactory;
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

                using var imageStream = new MemoryStream(attempt.ImageBytes);
                using var cleanShaveStream = attempt.CleanShaveBytes != null
                    ? new MemoryStream(attempt.CleanShaveBytes)
                    : null;

                var judgeResult = await geminiService.JudgeMustacheAsync(
                    imageStream,
                    attempt.ImageMimeType,
                    attempt.ContestantName,
                    cleanShaveStream,
                    attempt.CleanShaveMimeType,
                    attempt.CompetitionType,
                    cancellationToken);

                var entry = await dbContext.MustacheEntries
                    .FirstOrDefaultAsync(e => e.Id == attempt.EntryId, cancellationToken);

                if (entry == null)
                {
                    _logger.LogWarning("Queued entry {EntryId} no longer exists in database. Removing from retry queue.", attempt.EntryId);
                    _retryService.MarkCompleted(attempt.EntryId);
                    continue;
                }

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
                    bool hasCleanShave = attempt.CleanShaveBytes != null || !string.IsNullOrWhiteSpace(entry.CleanShaveImageUrl);

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
}
