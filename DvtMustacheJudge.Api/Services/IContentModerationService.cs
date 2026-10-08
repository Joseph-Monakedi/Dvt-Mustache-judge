namespace DvtMustacheJudge.Api.Services;

public record ModerationResult(bool IsAppropriate, string? Reason);

public interface IContentModerationService
{
    ModerationResult CheckName(string name);
}
