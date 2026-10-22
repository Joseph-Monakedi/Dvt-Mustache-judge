using DvtMustacheJudge.Api.Data;
using DvtMustacheJudge.Api.Models;
using DvtMustacheJudge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DvtMustacheJudge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class QuizController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _config;
    private readonly ILogger<QuizController> _logger;

    public QuizController(
        AppDbContext context,
        ITokenService tokenService,
        IConfiguration config,
        ILogger<QuizController> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Get the current active quiz state (for players & lobby screen).
    /// </summary>
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrentQuizState()
    {
        var quiz = await _context.QuizGames
            .Include(q => q.Questions.OrderBy(x => x.QuestionOrder))
            .Include(q => q.Players)
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefaultAsync();

        if (quiz == null)
        {
            return NotFound(new { error = "No active quiz game found." });
        }

        var totalQuestions = quiz.Questions.Count;
        QuizQuestion? currentQuestion = null;

        if (quiz.CurrentQuestionIndex >= 0 && quiz.CurrentQuestionIndex < totalQuestions)
        {
            currentQuestion = quiz.Questions[quiz.CurrentQuestionIndex];
        }

        var playerCount = quiz.Players.Count;

        // If status is AnswerReveal or Finished, compute answer distribution
        object? answerStats = null;
        if ((quiz.Status == "AnswerReveal" || quiz.Status == "Finished") && currentQuestion != null)
        {
            var answers = await _context.QuizPlayerAnswers
                .Where(a => a.QuizQuestionId == currentQuestion.Id)
                .ToListAsync();

            answerStats = new
            {
                countA = answers.Count(a => a.SelectedOption == 0),
                countB = answers.Count(a => a.SelectedOption == 1),
                countC = answers.Count(a => a.SelectedOption == 2),
                countD = answers.Count(a => a.SelectedOption == 3),
                totalAnswers = answers.Count
            };
        }

        return Ok(new
        {
            quizId = quiz.Id,
            title = quiz.Title,
            status = quiz.Status,
            pinCode = quiz.PinCode,
            currentQuestionIndex = quiz.CurrentQuestionIndex,
            totalQuestions,
            playerCount,
            players = quiz.Players.Select(p => new { id = p.Id, name = p.ContestantName }).ToList(),
            questionStartTime = quiz.QuestionStartTime,
            currentQuestion = currentQuestion == null ? null : new
            {
                id = currentQuestion.Id,
                questionOrder = currentQuestion.QuestionOrder,
                questionText = currentQuestion.QuestionText,
                imageUrl = currentQuestion.ImageUrl,
                optionA = currentQuestion.OptionA,
                optionB = currentQuestion.OptionB,
                optionC = currentQuestion.OptionC,
                optionD = currentQuestion.OptionD,
                timeLimitSeconds = currentQuestion.TimeLimitSeconds,
                points = currentQuestion.Points,
                correctOption = (quiz.Status == "AnswerReveal" || quiz.Status == "Finished") ? (int?)currentQuestion.CorrectOption : null
            },
            answerStats
        });
    }

    /// <summary>
    /// Join the Mustache Quiz Arena with PIN and contestant details.
    /// Checks that the user has paid the R50 fee.
    /// </summary>
    [HttpPost("join")]
    public async Task<IActionResult> JoinQuiz([FromBody] JoinQuizRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { error = "Player name is required." });
        }

        var pin = (request.Pin ?? "").Trim();
        var quiz = await _context.QuizGames
            .Include(q => q.Players)
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefaultAsync(q => q.PinCode == pin);

        if (quiz == null)
        {
            return NotFound(new { error = "Invalid Game PIN. Please enter the PIN communicated by the Admin." });
        }

        // Verify R50 Quiz payment and authentication
        Guid? userId = null;
        var authHeader = Request.Headers.Authorization.ToString();
        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();
            var payload = _tokenService.ValidateToken(token);
            if (payload != null)
            {
                var user = await _context.Users.FindAsync(payload.UserId);
                if (user != null)
                {
                    userId = user.Id;
                    if (!user.QuizPaid && user.Role != "Admin")
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new
                        {
                            error = "R50 Mustache Quiz Pass required. Please pay the R50 entry fee and have an Admin mark your pass active before entering the arena!",
                            paywall = true,
                            fee = "R50",
                            userId = user.Id
                        });
                    }
                }
            }
        }

        if (!userId.HasValue)
        {
            return Unauthorized(new { error = "Please sign in or register to enter the Mustache Quiz Arena." });
        }

        // Find or create player
        var cleanName = request.Name.Trim();
        var existingPlayer = quiz.Players.FirstOrDefault(p =>
            (userId.HasValue && p.UserId == userId.Value) ||
            p.ContestantName.Equals(cleanName, StringComparison.OrdinalIgnoreCase));

        if (existingPlayer != null)
        {
            return Ok(new
            {
                playerId = existingPlayer.Id,
                quizId = quiz.Id,
                contestantName = existingPlayer.ContestantName,
                totalScore = existingPlayer.TotalScore,
                streak = existingPlayer.Streak
            });
        }

        var player = new QuizPlayer
        {
            Id = Guid.NewGuid(),
            QuizGameId = quiz.Id,
            UserId = userId,
            ContestantName = cleanName,
            TotalScore = 0,
            Streak = 0,
            JoinedAt = DateTime.UtcNow
        };

        _context.QuizPlayers.Add(player);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            playerId = player.Id,
            quizId = quiz.Id,
            contestantName = player.ContestantName,
            totalScore = player.TotalScore,
            streak = player.Streak
        });
    }

    /// <summary>
    /// Submit an answer to the current question.
    /// </summary>
    [HttpPost("answer")]
    public async Task<IActionResult> SubmitAnswer([FromBody] SubmitAnswerRequest request)
    {
        var player = await _context.QuizPlayers.FindAsync(request.PlayerId);
        if (player == null)
        {
            return NotFound(new { error = "Player not found." });
        }

        var question = await _context.QuizQuestions.FindAsync(request.QuestionId);
        if (question == null)
        {
            return NotFound(new { error = "Question not found." });
        }

        // Check if player has already answered this question
        var alreadyAnswered = await _context.QuizPlayerAnswers.AnyAsync(a =>
            a.QuizPlayerId == request.PlayerId && a.QuizQuestionId == request.QuestionId);

        if (alreadyAnswered)
        {
            return Conflict(new { error = "You have already locked in an answer for this question." });
        }

        bool isCorrect = request.SelectedOption == question.CorrectOption;
        int pointsEarned = 0;

        if (isCorrect)
        {
            // Rapid response speed-decay scoring: max 1000 points, min 500 points for correct answers
            var responseMs = Math.Max(0, request.ResponseTimeMs);
            var maxTimeMs = question.TimeLimitSeconds * 1000.0;
            var timeRatio = Math.Clamp(responseMs / maxTimeMs, 0.0, 1.0);
            pointsEarned = Math.Max(500, (int)Math.Round((1.0 - (timeRatio / 2.0)) * question.Points));

            player.Streak += 1;
            player.TotalScore += pointsEarned;
        }
        else
        {
            player.Streak = 0;
        }

        var answerRecord = new QuizPlayerAnswer
        {
            Id = Guid.NewGuid(),
            QuizPlayerId = player.Id,
            QuizQuestionId = question.Id,
            SelectedOption = request.SelectedOption,
            IsCorrect = isCorrect,
            ResponseTimeMs = request.ResponseTimeMs,
            PointsEarned = pointsEarned,
            AnsweredAt = DateTime.UtcNow
        };

        _context.QuizPlayerAnswers.Add(answerRecord);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            isCorrect,
            pointsEarned,
            totalScore = player.TotalScore,
            streak = player.Streak,
            correctOption = question.CorrectOption
        });
    }

    /// <summary>
    /// Retrieve the live scoreboard & round standings.
    /// </summary>
    [HttpGet("scoreboard")]
    public async Task<IActionResult> GetScoreboard([FromQuery] Guid? playerId = null)
    {
        var quiz = await _context.QuizGames
            .Include(q => q.Players)
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefaultAsync();

        if (quiz == null)
        {
            return NotFound(new { error = "No active quiz game found." });
        }

        var sortedPlayers = quiz.Players
            .OrderByDescending(p => p.TotalScore)
            .ThenBy(p => p.JoinedAt)
            .ToList();

        var topPlayers = sortedPlayers.Take(10).Select((p, idx) => new
        {
            rank = idx + 1,
            id = p.Id,
            name = p.ContestantName,
            score = p.TotalScore,
            streak = p.Streak
        }).ToList();

        int? playerRank = null;
        object? playerStats = null;

        if (playerId.HasValue)
        {
            var idx = sortedPlayers.FindIndex(p => p.Id == playerId.Value);
            if (idx >= 0)
            {
                playerRank = idx + 1;
                var me = sortedPlayers[idx];
                playerStats = new
                {
                    rank = playerRank,
                    name = me.ContestantName,
                    score = me.TotalScore,
                    streak = me.Streak
                };
            }
        }

        return Ok(new
        {
            topPlayers,
            totalPlayers = sortedPlayers.Count,
            playerRank,
            playerStats
        });
    }

    // ==========================================
    // ADMIN QUIZ CONTROLLER ENDPOINTS
    // ==========================================

    [HttpPost("admin/start-lobby")]
    public async Task<IActionResult> AdminStartLobby()
    {
        if (!IsAdmin()) return Unauthorized();

        var quiz = await _context.QuizGames.OrderByDescending(q => q.CreatedAt).FirstOrDefaultAsync();
        if (quiz == null) return NotFound(new { error = "No quiz found." });

        quiz.Status = "Lobby";
        quiz.CurrentQuestionIndex = 0;
        quiz.QuestionStartTime = null;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Quiz returned to Lobby state.", status = quiz.Status });
    }

    [HttpPost("admin/next-question")]
    public async Task<IActionResult> AdminNextQuestion([FromBody] AdminNextQuestionRequest? req = null)
    {
        if (!IsAdmin()) return Unauthorized();

        var quiz = await _context.QuizGames
            .Include(q => q.Questions.OrderBy(x => x.QuestionOrder))
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefaultAsync();

        if (quiz == null) return NotFound(new { error = "No quiz found." });

        int targetIndex = req?.QuestionIndex ?? (quiz.Status == "Lobby" ? 0 : quiz.CurrentQuestionIndex + 1);

        if (targetIndex >= quiz.Questions.Count)
        {
            quiz.Status = "Finished";
            await _context.SaveChangesAsync();
            return Ok(new { message = "Quiz completed!", status = quiz.Status });
        }

        quiz.CurrentQuestionIndex = targetIndex;
        quiz.Status = "Question";
        quiz.QuestionStartTime = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var question = quiz.Questions[targetIndex];
        return Ok(new
        {
            message = $"Question {targetIndex + 1} is now active!",
            status = quiz.Status,
            questionIndex = targetIndex,
            question = new
            {
                id = question.Id,
                order = question.QuestionOrder,
                text = question.QuestionText,
                optionA = question.OptionA,
                optionB = question.OptionB,
                optionC = question.OptionC,
                optionD = question.OptionD,
                timeLimit = question.TimeLimitSeconds
            }
        });
    }

    [HttpPost("admin/reveal-round")]
    public async Task<IActionResult> AdminRevealRound()
    {
        if (!IsAdmin()) return Unauthorized();

        var quiz = await _context.QuizGames
            .Include(q => q.Questions.OrderBy(x => x.QuestionOrder))
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefaultAsync();

        if (quiz == null) return NotFound(new { error = "No quiz found." });

        quiz.Status = "AnswerReveal";
        await _context.SaveChangesAsync();

        var currentQuestion = quiz.Questions.ElementAtOrDefault(quiz.CurrentQuestionIndex);
        var answers = currentQuestion != null
            ? await _context.QuizPlayerAnswers.Where(a => a.QuizQuestionId == currentQuestion.Id).ToListAsync()
            : new List<QuizPlayerAnswer>();

        return Ok(new
        {
            message = "Answer revealed!",
            status = quiz.Status,
            correctOption = currentQuestion?.CorrectOption,
            stats = new
            {
                countA = answers.Count(a => a.SelectedOption == 0),
                countB = answers.Count(a => a.SelectedOption == 1),
                countC = answers.Count(a => a.SelectedOption == 2),
                countD = answers.Count(a => a.SelectedOption == 3),
                totalAnswers = answers.Count
            }
        });
    }

    [HttpPost("admin/end")]
    public async Task<IActionResult> AdminEndQuiz()
    {
        if (!IsAdmin()) return Unauthorized();

        var quiz = await _context.QuizGames
            .Include(q => q.Players)
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefaultAsync();

        if (quiz == null) return NotFound(new { error = "No quiz found." });

        quiz.Status = "Finished";
        await _context.SaveChangesAsync();

        var podium = quiz.Players
            .OrderByDescending(p => p.TotalScore)
            .Take(3)
            .Select((p, idx) => new
            {
                rank = idx + 1,
                name = p.ContestantName,
                score = p.TotalScore
            }).ToList();

        return Ok(new
        {
            message = "Quiz ended! Podium calculated.",
            status = quiz.Status,
            podium
        });
    }

    [HttpPost("admin/reset-scores")]
    public async Task<IActionResult> AdminResetScores()
    {
        if (!IsAdmin()) return Unauthorized();

        var quiz = await _context.QuizGames
            .Include(q => q.Players)
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefaultAsync();

        if (quiz == null) return NotFound(new { error = "No quiz found." });

        foreach (var player in quiz.Players)
        {
            player.TotalScore = 0;
            player.Streak = 0;
        }

        var allAnswers = await _context.QuizPlayerAnswers
            .Where(a => quiz.Players.Select(p => p.Id).Contains(a.QuizPlayerId))
            .ToListAsync();

        _context.QuizPlayerAnswers.RemoveRange(allAnswers);

        quiz.Status = "Lobby";
        quiz.CurrentQuestionIndex = 0;
        quiz.QuestionStartTime = null;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Quiz scores and answers reset to zero. Returned to Lobby." });
    }

    /// <summary>
    /// Admin endpoint to set or generate a fresh game PIN to communicate to players manually.
    /// </summary>
    [HttpPost("admin/set-pin")]
    public async Task<IActionResult> AdminSetPin([FromBody] SetPinRequest request)
    {
        if (!IsAdmin()) return Unauthorized();

        var quiz = await _context.QuizGames
            .OrderByDescending(q => q.CreatedAt)
            .FirstOrDefaultAsync();

        if (quiz == null) return NotFound(new { error = "No quiz found." });

        var newPin = string.IsNullOrWhiteSpace(request?.Pin)
            ? Random.Shared.Next(100000, 999999).ToString()
            : request.Pin.Trim();

        quiz.PinCode = newPin;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Game PIN updated to {newPin}", pinCode = newPin });
    }

    private bool IsAdmin()
    {
        var adminPassword = _config["Admin:Password"] ?? "dvt-movember-admin-2026";
        if (Request.Headers.TryGetValue("X-Admin-Password", out var pwd) && pwd == adminPassword)
        {
            return true;
        }

        var authHeader = Request.Headers.Authorization.ToString();
        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader.Substring("Bearer ".Length).Trim();
            var payload = _tokenService.ValidateToken(token);
            if (payload != null && payload.Role == "Admin")
            {
                return true;
            }
        }

        return false;
    }
}

public record JoinQuizRequest(string Pin, string Name);
public record SetPinRequest(string? Pin);
public record SubmitAnswerRequest(Guid PlayerId, Guid QuestionId, int SelectedOption, int ResponseTimeMs);
public record AdminNextQuestionRequest(int? QuestionIndex);
