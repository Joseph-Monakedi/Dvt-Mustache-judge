using System.ComponentModel.DataAnnotations;

namespace DvtMustacheJudge.Api.Models;

public class MustacheEntry
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string ContestantName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? OfficeLocation { get; set; }

    [Required]
    public string ImageUrl { get; set; } = string.Empty;

    [Required]
    public string ThumbnailUrl { get; set; } = string.Empty;

    public int OverallScore { get; set; }
    public int DensityScore { get; set; }
    public int SymmetryScore { get; set; }
    public int SwaggerScore { get; set; }

    [MaxLength(150)]
    public string MustacheTitle { get; set; } = string.Empty;

    [MaxLength(100)]
    public string StyleCategory { get; set; } = "Other";

    public string RoastCommentary { get; set; } = string.Empty;

    [MaxLength(200)]
    public string CelebrityTwin { get; set; } = string.Empty;

    [MaxLength(100)]
    public string VerdictBadge { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsHidden { get; set; } = false;
}
