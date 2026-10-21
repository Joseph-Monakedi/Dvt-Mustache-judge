using System.ComponentModel.DataAnnotations;

namespace DvtMustacheJudge.Api.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(120)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string OfficeLocation { get; set; } = "Johannesburg";

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public string Salt { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Role { get; set; } = "Contestant"; // "Contestant" | "Admin"

    // Entry to Leaderboard (R100 fee managed by admin)
    public bool LeaderboardPaid { get; set; } = false;

    // Entry to Mustache Quiz Arena (R50 fee managed by admin)
    public bool QuizPaid { get; set; } = false;

    // Day 1 Clean Shave baseline picture for growth comparison
    public string? CleanShaveImageUrl { get; set; }
    public DateTime? CleanShaveUploadedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public List<MustacheEntry> Entries { get; set; } = new();
}
