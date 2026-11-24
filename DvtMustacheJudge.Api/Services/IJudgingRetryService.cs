namespace DvtMustacheJudge.Api.Services;

public class PendingJudgingAttempt
{
    public Guid EntryId { get; set; }
    public string ContestantName { get; set; } = string.Empty;
    public byte[] ImageBytes { get; set; } = Array.Empty<byte>();
    public string ImageMimeType { get; set; } = "image/jpeg";
    public byte[]? CleanShaveBytes { get; set; }
    public string? CleanShaveMimeType { get; set; }
    public string CompetitionType { get; set; } = "Mustache";
    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; } = 5;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime NextRetryAtUtc { get; set; } = DateTime.UtcNow;
    public string? LastError { get; set; }
}

public interface IJudgingRetryService
{
    void Enqueue(PendingJudgingAttempt attempt);
    IReadOnlyList<PendingJudgingAttempt> GetDueAttempts(DateTime utcNow);
    void MarkCompleted(Guid entryId);
    void ScheduleNextRetry(Guid entryId, string errorMessage);
    bool IsPending(Guid entryId);
    int PendingCount { get; }
}
