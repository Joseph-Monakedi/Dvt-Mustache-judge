using System.ComponentModel.DataAnnotations;

namespace DvtMustacheJudge.Api.Models;

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(2), MaxLength(100)] string FullName,
    [Required, MinLength(6)] string Password,
    string PreferredCompetition = "Mustache"
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

public record ForgotPasswordRequest(
    [Required, EmailAddress] string Email
);

public record ResetPasswordRequest(
    [Required] string Token,
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string NewPassword
);

public record AuthResponse(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    bool LeaderboardPaid,
    bool QuizPaid,
    string Token,
    string? CleanShaveImageUrl = null,
    DateTime? CleanShaveUploadedAt = null,
    string? PaymentMethod = null,
    string? PreferredCompetition = "Mustache",
    decimal? AmountPaid = null
);

public record ContestantSummaryDto(
    Guid Id,
    string Email,
    string FullName,
    string Role,
    bool LeaderboardPaid,
    bool QuizPaid,
    int TotalSubmissions,
    int HighestScore,
    string? BestMustacheTitle,
    string? BestThumbnailUrl,
    DateTime JoinedAt,
    string? CleanShaveImageUrl = null,
    DateTime? CleanShaveUploadedAt = null,
    string? PaymentMethod = null,
    string? PreferredCompetition = "Mustache",
    decimal? AmountPaid = null
);

public record SetDonationRequest(
    bool Eligible,
    decimal? Amount = null
);

public record TogglePaymentRequest(
    bool Paid
);

public record CreatePayFastPaymentRequest(
    string ItemType, // "Leaderboard" | "Quiz" | "Combo"
    string? ReturnUrl = null,
    string? CancelUrl = null
);

public record CreatePayFastPaymentResponse(
    string ProcessUrl,
    Dictionary<string, string> Fields,
    string Reference,
    decimal Amount,
    string ItemType
);

public record ConfirmPayFastReturnRequest(
    string? Reference,
    string? ItemType = null,
    string? PfPaymentId = null
);
