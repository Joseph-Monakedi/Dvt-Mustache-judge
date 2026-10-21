using System.Text.Json.Serialization;

namespace DvtMustacheJudge.Api.Models;

public class GeminiJudgeResult
{
    [JsonPropertyName("overallScore")]
    public int OverallScore { get; set; }

    [JsonPropertyName("mustacheTitle")]
    public string MustacheTitle { get; set; } = string.Empty;

    [JsonPropertyName("densityScore")]
    public int DensityScore { get; set; }

    [JsonPropertyName("symmetryScore")]
    public int SymmetryScore { get; set; }

    [JsonPropertyName("swaggerScore")]
    public int SwaggerScore { get; set; }

    [JsonPropertyName("isWoodenSpoon")]
    public bool IsWoodenSpoon { get; set; } = false;

    [JsonPropertyName("woodenSpoonReason")]
    public string? WoodenSpoonReason { get; set; }

    [JsonPropertyName("innovationScore")]
    public int InnovationScore { get; set; } = 0;

    [JsonPropertyName("dedicationScore")]
    public int DedicationScore { get; set; } = 0;

    [JsonPropertyName("funninessScore")]
    public int FunninessScore { get; set; } = 0;

    [JsonPropertyName("styleCategory")]
    public string StyleCategory { get; set; } = "Other";

    [JsonPropertyName("roast")]
    public string Roast { get; set; } = string.Empty;

    [JsonPropertyName("celebrityTwin")]
    public string CelebrityTwin { get; set; } = string.Empty;

    [JsonPropertyName("verdictBadge")]
    public string VerdictBadge { get; set; } = string.Empty;

    [JsonPropertyName("growthScore")]
    public int GrowthScore { get; set; } = 0;

    [JsonPropertyName("growthAnalysis")]
    public string? GrowthAnalysis { get; set; }

    [JsonPropertyName("isAppropriate")]
    public bool IsAppropriate { get; set; } = true;

    [JsonPropertyName("inappropriateReason")]
    public string? InappropriateReason { get; set; }
}

public class JudgeRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? OfficeLocation { get; set; }
    public string? Location { get; set; }
    public string? Cohort { get; set; }
    public IFormFile? Image { get; set; }
    public IFormFile? CleanShaveImage { get; set; }

    public string GetResolvedLocation()
    {
        if (!string.IsNullOrWhiteSpace(OfficeLocation)) return OfficeLocation.Trim();
        if (!string.IsNullOrWhiteSpace(Location)) return Location.Trim();
        if (!string.IsNullOrWhiteSpace(Cohort)) return Cohort.Trim();
        return "REMOTE";
    }
}

public class JudgeResponseDto
{
    public Guid Id { get; set; }
    public string ContestantName { get; set; } = string.Empty;
    public string? OfficeLocation { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public string? CleanShaveImageUrl { get; set; }
    public int OverallScore { get; set; }
    public int DensityScore { get; set; }
    public int SymmetryScore { get; set; }
    public int SwaggerScore { get; set; }
    public int GrowthScore { get; set; }
    public string? GrowthAnalysis { get; set; }
    public bool IsWoodenSpoon { get; set; }
    public string? WoodenSpoonReason { get; set; }
    public int InnovationScore { get; set; }
    public int DedicationScore { get; set; }
    public int FunninessScore { get; set; }
    public string MustacheTitle { get; set; } = string.Empty;
    public string StyleCategory { get; set; } = string.Empty;
    public string Roast { get; set; } = string.Empty;
    public string CelebrityTwin { get; set; } = string.Empty;
    public string VerdictBadge { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsLeaderboardEligible { get; set; }
    public bool IsBestEntry { get; set; }
    public Guid? UserId { get; set; }
}

public class UserEntryDto : LeaderboardEntryDto
{
    public bool IsBestEntry { get; set; }
}

public class UserEntriesResponseDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string OfficeLocation { get; set; } = string.Empty;
    public bool LeaderboardPaid { get; set; }
    public bool QuizPaid { get; set; }
    public string? CleanShaveImageUrl { get; set; }
    public DateTime? CleanShaveUploadedAt { get; set; }
    public int TotalSubmissions { get; set; }
    public int BestScore { get; set; }
    public int? LeaderboardRank { get; set; }
    public List<UserEntryDto> Entries { get; set; } = new();
}

public class LeaderboardEntryDto
{
    public int Rank { get; set; }
    public Guid Id { get; set; }
    public string ContestantName { get; set; } = string.Empty;
    public string? OfficeLocation { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public string? CleanShaveImageUrl { get; set; }
    public int OverallScore { get; set; }
    public int DensityScore { get; set; }
    public int SymmetryScore { get; set; }
    public int SwaggerScore { get; set; }
    public int GrowthScore { get; set; }
    public string? GrowthAnalysis { get; set; }
    public bool IsWoodenSpoon { get; set; }
    public string? WoodenSpoonReason { get; set; }
    public int InnovationScore { get; set; }
    public int DedicationScore { get; set; }
    public int FunninessScore { get; set; }
    public string MustacheTitle { get; set; } = string.Empty;
    public string StyleCategory { get; set; } = string.Empty;
    public string Roast { get; set; } = string.Empty;
    public string CelebrityTwin { get; set; } = string.Empty;
    public string VerdictBadge { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class LeaderboardResponseDto
{
    public int TotalEntries { get; set; }
    public int ChampionshipEntriesCount { get; set; }
    public int WoodenSpoonEntriesCount { get; set; }
    public string Division { get; set; } = "championship";
    public List<LeaderboardEntryDto> Entries { get; set; } = new();
}

public class AdminLoginRequest
{
    public string Password { get; set; } = string.Empty;
}

public class AdminEntryDto : LeaderboardEntryDto
{
    public bool IsHidden { get; set; }
}

public class AdminOverviewDto
{
    public int TotalSubmissions { get; set; }
    public int VisibleCount { get; set; }
    public int HiddenCount { get; set; }
    public int ChampionshipCount { get; set; }
    public int WoodenSpoonCount { get; set; }
    public double AverageScore { get; set; }
    public int TopScore { get; set; }
    public int RemainingAiQuota { get; set; } = 3;
    public int MaxAiQuotaPerMinute { get; set; } = 3;
    public int SecondsUntilQuotaReset { get; set; } = 0;
    public int QueuedRequestsCount { get; set; } = 0;
    public List<AdminEntryDto> Entries { get; set; } = new();
}

public class BulkDeleteRequestDto
{
    public List<Guid> Ids { get; set; } = new();
}

public class ReanalyseRequestDto
{
    public List<Guid> Ids { get; set; } = new();
}

public class ReanalyseResponseDto
{
    public bool Success { get; set; }
    public int ReanalysedCount { get; set; }
    public int SkippedDueToRateLimit { get; set; }
    public string Message { get; set; } = string.Empty;
    public int RemainingRequests { get; set; }
    public int SecondsUntilReset { get; set; }
    public List<AdminEntryDto> UpdatedEntries { get; set; } = new();
}
