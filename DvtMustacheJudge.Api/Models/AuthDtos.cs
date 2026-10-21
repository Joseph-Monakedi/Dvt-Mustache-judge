using System.ComponentModel.DataAnnotations;

namespace DvtMustacheJudge.Api.Models;

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(2), MaxLength(100)] string FullName,
    [Required, MinLength(6)] string Password
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
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
    DateTime? CleanShaveUploadedAt = null
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
    DateTime? CleanShaveUploadedAt = null
);

public record TogglePaymentRequest(
    bool Paid
);
