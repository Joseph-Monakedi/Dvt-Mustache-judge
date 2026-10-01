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

    [JsonPropertyName("styleCategory")]
    public string StyleCategory { get; set; } = "Other";

    [JsonPropertyName("roast")]
    public string Roast { get; set; } = string.Empty;

    [JsonPropertyName("celebrityTwin")]
    public string CelebrityTwin { get; set; } = string.Empty;

    [JsonPropertyName("verdictBadge")]
    public string VerdictBadge { get; set; } = string.Empty;

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
    public int OverallScore { get; set; }
    public int DensityScore { get; set; }
    public int SymmetryScore { get; set; }
    public int SwaggerScore { get; set; }
    public string MustacheTitle { get; set; } = string.Empty;
    public string StyleCategory { get; set; } = string.Empty;
    public string Roast { get; set; } = string.Empty;
    public string CelebrityTwin { get; set; } = string.Empty;
    public string VerdictBadge { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class LeaderboardEntryDto
{
    public int Rank { get; set; }
    public Guid Id { get; set; }
    public string ContestantName { get; set; } = string.Empty;
    public string? OfficeLocation { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public int OverallScore { get; set; }
    public int DensityScore { get; set; }
    public int SymmetryScore { get; set; }
    public int SwaggerScore { get; set; }
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
    public double AverageScore { get; set; }
    public int TopScore { get; set; }
    public List<AdminEntryDto> Entries { get; set; } = new();
}
