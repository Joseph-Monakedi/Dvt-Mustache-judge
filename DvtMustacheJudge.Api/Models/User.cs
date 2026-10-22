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

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public string Salt { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Role { get; set; } = "Contestant"; // "Contestant" | "Admin"

    // Entry to Leaderboard (R100 fee managed by admin or PayFast)
    public bool LeaderboardPaid { get; set; } = false;

    // Entry to Mustache Quiz Arena (R50 fee managed by admin or PayFast)
    public bool QuizPaid { get; set; } = false;

    // Payment Tracking (PayFast automation & audit)
    [MaxLength(50)]
    public string? PaymentMethod { get; set; } // "PayFast" | "ManualAdmin"

    [MaxLength(100)]
    public string? PayfastPaymentId { get; set; }

    public decimal? AmountPaid { get; set; }

    public DateTime? PaidAt { get; set; }

    // Day 1 Clean Shave baseline picture for growth comparison
    public string? CleanShaveImageUrl { get; set; }
    public DateTime? CleanShaveUploadedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public List<MustacheEntry> Entries { get; set; } = new();
}
