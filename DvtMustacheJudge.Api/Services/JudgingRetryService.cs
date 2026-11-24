using System.Collections.Concurrent;

namespace DvtMustacheJudge.Api.Services;

public class JudgingRetryService : IJudgingRetryService
{
    private readonly ConcurrentDictionary<Guid, PendingJudgingAttempt> _pendingAttempts = new();
    private readonly ILogger<JudgingRetryService> _logger;

    public JudgingRetryService(ILogger<JudgingRetryService> logger)
    {
        _logger = logger;
    }

    public int PendingCount => _pendingAttempts.Count;

    public bool IsPending(Guid entryId) => _pendingAttempts.ContainsKey(entryId);

    public void Enqueue(PendingJudgingAttempt attempt)
    {
        if (attempt.EntryId == Guid.Empty)
        {
            throw new ArgumentException("EntryId must not be empty.", nameof(attempt));
        }

        if (attempt.NextRetryAtUtc <= attempt.CreatedAtUtc)
        {
            // Initial background retry backoff: 10 seconds + jitter
            var jitterMs = Random.Shared.Next(200, 1200);
            attempt.NextRetryAtUtc = DateTime.UtcNow.AddSeconds(10).AddMilliseconds(jitterMs);
        }

        _pendingAttempts[attempt.EntryId] = attempt;
        _logger.LogInformation(
            "Queued mustache judging attempt {EntryId} for contestant '{Name}' ({Comp}) for background retry at {NextRetryUtc:O}. Queue size: {Count}",
            attempt.EntryId,
            attempt.ContestantName,
            attempt.CompetitionType,
            attempt.NextRetryAtUtc,
            _pendingAttempts.Count);
    }

    public IReadOnlyList<PendingJudgingAttempt> GetDueAttempts(DateTime utcNow)
    {
        return _pendingAttempts.Values
            .Where(a => a.NextRetryAtUtc <= utcNow && a.AttemptCount < a.MaxAttempts)
            .OrderBy(a => a.NextRetryAtUtc)
            .ToList();
    }

    public void MarkCompleted(Guid entryId)
    {
        if (_pendingAttempts.TryRemove(entryId, out var removed))
        {
            _logger.LogInformation(
                "Background Gemini judging retry succeeded for entry {EntryId} ('{Name}') after {Attempts} attempt(s).",
                entryId,
                removed.ContestantName,
                removed.AttemptCount + 1);
        }
    }

    public void ScheduleNextRetry(Guid entryId, string errorMessage)
    {
        if (!_pendingAttempts.TryGetValue(entryId, out var attempt))
        {
            return;
        }

        attempt.AttemptCount++;
        attempt.LastError = errorMessage;

        if (attempt.AttemptCount >= attempt.MaxAttempts)
        {
            _pendingAttempts.TryRemove(entryId, out _);
            _logger.LogWarning(
                "Background Gemini judging retry exhausted max attempts ({MaxAttempts}) for entry {EntryId} ('{Name}'). Retaining saved provisional entry. Last error: {Error}",
                attempt.MaxAttempts,
                entryId,
                attempt.ContestantName,
                errorMessage);
            return;
        }

        // Exponential backoff: 15s, 30s, 60s, 120s, 240s (capped at 300s) + random jitter
        double baseDelaySeconds = Math.Min(300, 15 * Math.Pow(2, attempt.AttemptCount - 1));
        double jitterSeconds = Random.Shared.NextDouble() * 3.0;
        var totalDelay = TimeSpan.FromSeconds(baseDelaySeconds + jitterSeconds);

        attempt.NextRetryAtUtc = DateTime.UtcNow.Add(totalDelay);

        _logger.LogWarning(
            "Background Gemini judging attempt {Attempt}/{Max} failed for entry {EntryId} ('{Name}'): {Error}. Next exponential backoff retry in {Delay:F1}s at {NextRetryUtc:O}.",
            attempt.AttemptCount,
            attempt.MaxAttempts,
            entryId,
            attempt.ContestantName,
            errorMessage,
            totalDelay.TotalSeconds,
            attempt.NextRetryAtUtc);
    }
}
