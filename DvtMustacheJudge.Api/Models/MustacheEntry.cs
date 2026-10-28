using System.ComponentModel.DataAnnotations;

namespace DvtMustacheJudge.Api.Models;

public class MustacheEntry
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string ContestantName { get; set; } = string.Empty;

    [Required]
    public string ImageUrl { get; set; } = string.Empty;

    [Required]
    public string ThumbnailUrl { get; set; } = string.Empty;

    public int OverallScore { get; set; }
    public int DensityScore { get; set; }
    public int SymmetryScore { get; set; }
    public int SwaggerScore { get; set; }

    // Competition division: "Mustache" (Movember Mustache Challenge) or "CrazyHair" (The Mane Event: Crazy Hair Challenge)
    [MaxLength(50)]
    public string CompetitionType { get; set; } = "Mustache";

    // Legacy Wooden Spoon Division properties (preserved for backward compatibility)
    public bool IsWoodenSpoon { get; set; } = false;

    [MaxLength(100)]
    public string? WoodenSpoonReason { get; set; }

    public int InnovationScore { get; set; } = 0;
    public int DedicationScore { get; set; } = 0;
    public int FunninessScore { get; set; } = 0;

    [MaxLength(150)]
    public string MustacheTitle { get; set; } = string.Empty;

    [MaxLength(100)]
    public string StyleCategory { get; set; } = "Other";

    public string RoastCommentary { get; set; } = string.Empty;

    [MaxLength(200)]
    public string CelebrityTwin { get; set; } = string.Empty;

    [MaxLength(100)]
    public string VerdictBadge { get; set; } = string.Empty;

    // Day 1 Clean Shave baseline picture & growth comparison metrics
    public string? CleanShaveImageUrl { get; set; }
    public int GrowthScore { get; set; } = 0;
    public string? GrowthAnalysis { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsHidden { get; set; } = false;

    // Foreign key to User
    public Guid? UserId { get; set; }
    public User? User { get; set; }
}
