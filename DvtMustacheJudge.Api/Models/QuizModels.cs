using System.ComponentModel.DataAnnotations;

namespace DvtMustacheJudge.Api.Models;

public class QuizGame
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = "DVT Movember Mustache Quiz";

    [MaxLength(30)]
    public string Status { get; set; } = "Lobby"; // "Lobby", "Question", "AnswerReveal", "Finished"

    [MaxLength(10)]
    public string PinCode { get; set; } = "69420";

    public int CurrentQuestionIndex { get; set; } = 0;

    public DateTime? QuestionStartTime { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<QuizQuestion> Questions { get; set; } = new();
    public List<QuizPlayer> Players { get; set; } = new();
}

public class QuizQuestion
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid QuizGameId { get; set; }

    public int QuestionOrder { get; set; }

    [Required]
    [MaxLength(300)]
    public string QuestionText { get; set; } = string.Empty;

    public string? ImageUrl { get; set; }

    [Required]
    [MaxLength(150)]
    public string OptionA { get; set; } = string.Empty; // Red Triangle

    [Required]
    [MaxLength(150)]
    public string OptionB { get; set; } = string.Empty; // Blue Diamond

    [Required]
    [MaxLength(150)]
    public string OptionC { get; set; } = string.Empty; // Yellow Circle

    [Required]
    [MaxLength(150)]
    public string OptionD { get; set; } = string.Empty; // Green Square

    public int CorrectOption { get; set; } = 0; // 0=A, 1=B, 2=C, 3=D

    public int TimeLimitSeconds { get; set; } = 20;

    public int Points { get; set; } = 1000;
}

public class QuizPlayer
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid QuizGameId { get; set; }

    public Guid? UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string ContestantName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string OfficeLocation { get; set; } = "Johannesburg";

    public int TotalScore { get; set; } = 0;

    public int Streak { get; set; } = 0;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public List<QuizPlayerAnswer> Answers { get; set; } = new();
}

public class QuizPlayerAnswer
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid QuizPlayerId { get; set; }

    public Guid QuizQuestionId { get; set; }

    public int SelectedOption { get; set; } // 0, 1, 2, 3

    public bool IsCorrect { get; set; }

    public int ResponseTimeMs { get; set; }

    public int PointsEarned { get; set; }

    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;
}
