using DvtMustacheJudge.Api.Models;

namespace DvtMustacheJudge.Api.Services;

public interface IGeminiJudgeService
{
    Task<GeminiJudgeResult> JudgeMustacheAsync(Stream imageStream, string mimeType, string contestantName, string? officeLocation);
}
