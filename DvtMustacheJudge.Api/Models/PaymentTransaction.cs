using System.ComponentModel.DataAnnotations;

namespace DvtMustacheJudge.Api.Models;

public class PaymentTransaction
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(50)]
    public string ItemType { get; set; } = "Leaderboard"; // "Leaderboard" | "Quiz" | "Combo"

    public decimal Amount { get; set; }

    [MaxLength(30)]
    public string Status { get; set; } = "Pending"; // "Pending" | "COMPLETE" | "CANCELLED" | "FAILED"

    [MaxLength(100)]
    public string? PayfastPaymentId { get; set; }

    [Required]
    [MaxLength(100)]
    public string PaymentReference { get; set; } = string.Empty;

    [MaxLength(120)]
    public string? CustomerEmail { get; set; }

    [MaxLength(100)]
    public string? CustomerName { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAt { get; set; }
}
