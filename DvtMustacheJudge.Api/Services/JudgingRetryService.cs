using System.Collections.Concurrent;
using System.Text.Json;

namespace DvtMustacheJudge.Api.Services;

public class JudgingRetryService : IJudgingRetryService
{
    private const int MaxQueueCapacity = 500;
    private readonly ConcurrentDictionary<Guid, PendingJudgingAttempt> _pendingAttempts = new();
    private readonly object _persistenceLock = new();
    private readonly string _persistenceFilePath;
    private readonly ILogger<JudgingRetryService> _logger;

    public JudgingRetryService(ILogger<JudgingRetryService> logger, string? persistenceFilePath = null)
    {
        _logger = logger;
        _persistenceFilePath = string.IsNullOrWhiteSpace(persistenceFilePath)
            ? Path.Combine(AppContext.BaseDirectory, "pending-judging-retries.json")
            : persistenceFilePath;

        LoadPersistedAttempts();
    }

    public int PendingCount => _pendingAttempts.Count;

    public bool IsPending(Guid entryId) => _pendingAttempts.ContainsKey(entryId);

    public void Enqueue(PendingJudgingAttempt attempt)
    {
        if (attempt.EntryId == Guid.Empty)
        {
            throw new ArgumentException("EntryId must not be empty.", nameof(attempt));
        }

        // Enforce upper capacity bound to prevent unbounded growth during extended outages
        if (_pendingAttempts.Count >= MaxQueueCapacity && !_pendingAttempts.ContainsKey(attempt.EntryId))
        {
            var oldest = _pendingAttempts.Values.OrderBy(a => a.CreatedAtUtc).FirstOrDefault();
            if (oldest != null)
            {
                _pendingAttempts.TryRemove(oldest.EntryId, out _);
            }
        }

        if (attempt.NextRetryAtUtc <= attempt.CreatedAtUtc)
        {
            // Initial background retry backoff: 10 seconds + jitter
            var jitterMs = Random.Shared.Next(200, 1200);
            attempt.NextRetryAtUtc = DateTime.UtcNow.AddSeconds(10).AddMilliseconds(jitterMs);
        }

        _pendingAttempts[attempt.EntryId] = attempt;
        PersistAttemptsToDisk();

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
            PersistAttemptsToDisk();
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
            PersistAttemptsToDisk();
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
        PersistAttemptsToDisk();

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

    private void LoadPersistedAttempts()
    {
        lock (_persistenceLock)
        {
            try
            {
                if (!File.Exists(_persistenceFilePath))
                {
                    return;
                }

                var json = File.ReadAllText(_persistenceFilePath);
                if (string.IsNullOrWhiteSpace(json))
                {
                    return;
                }

                var items = JsonSerializer.Deserialize<List<PendingJudgingAttempt>>(json);
                if (items == null)
                {
                    return;
                }

                foreach (var item in items.Where(i => i.EntryId != Guid.Empty && i.AttemptCount < i.MaxAttempts))
                {
                    _pendingAttempts[item.EntryId] = item;
                }

                if (_pendingAttempts.Count > 0)
                {
                    _logger.LogInformation("Restored {Count} pending Gemini judging retry attempt(s) from disk.", _pendingAttempts.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not load persisted judging retry queue from {Path}.", _persistenceFilePath);
            }
        }
    }

    private void PersistAttemptsToDisk()
    {
        lock (_persistenceLock)
        {
            try
            {
                var snapshot = _pendingAttempts.Values.OrderBy(a => a.CreatedAtUtc).ToList();
                var json = JsonSerializer.Serialize(snapshot);
                var tempPath = _persistenceFilePath + ".tmp";
                File.WriteAllText(tempPath, json);
                File.Move(tempPath, _persistenceFilePath, overwrite: true);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not persist judging retry queue to {Path}.", _persistenceFilePath);
            }
        }
    }
}
