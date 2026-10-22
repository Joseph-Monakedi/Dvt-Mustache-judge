using DvtMustacheJudge.Api.Data;
using DvtMustacheJudge.Api.Models;
using DvtMustacheJudge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DvtMustacheJudge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext context,
        ITokenService tokenService,
        IConfiguration config,
        ILogger<AuthController> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _config = config;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (existingUser != null)
        {
            return Conflict(new { error = "An account with this email address already exists. Please log in." });
        }

        var (hash, salt) = PasswordHasher.HashPassword(request.Password);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = hash,
            Salt = salt,
            Role = "Contestant",
            LeaderboardPaid = false,
            QuizPaid = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user);

        return Ok(new AuthResponse(
            user.Id,
            user.Email,
            user.FullName,
            user.Role,
            user.LeaderboardPaid,
            user.QuizPaid,
            token,
            user.CleanShaveImageUrl,
            user.CleanShaveUploadedAt,
            user.PaymentMethod
        ));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // 1. Check if user is in database
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (user == null)
        {
            // Check if admin password fallback matches
            var adminPassword = _config["Admin:Password"] ?? "dvt-movember-admin-2026";
            if (normalizedEmail == "admin@dvt.co.za" && request.Password == adminPassword)
            {
                var (hash, salt) = PasswordHasher.HashPassword(adminPassword);
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = "admin@dvt.co.za",
                    FullName = "DVT Movember Admin",
                    PasswordHash = hash,
                    Salt = salt,
                    Role = "Admin",
                    LeaderboardPaid = true,
                    QuizPaid = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
            }
            else
            {
                return Unauthorized(new { error = "Invalid email or password." });
            }
        }

        // 2. Verify password
        bool valid = PasswordHasher.VerifyPassword(request.Password, user.PasswordHash, user.Salt);
        if (!valid)
        {
            // Also check admin master password for admin accounts
            var adminPassword = _config["Admin:Password"] ?? "dvt-movember-admin-2026";
            if (user.Role == "Admin" && request.Password == adminPassword)
            {
                valid = true;
            }
            else
            {
                return Unauthorized(new { error = "Invalid email or password." });
            }
        }

        var token = _tokenService.GenerateToken(user);

        return Ok(new AuthResponse(
            user.Id,
            user.Email,
            user.FullName,
            user.Role,
            user.LeaderboardPaid,
            user.QuizPaid,
            token,
            user.CleanShaveImageUrl,
            user.CleanShaveUploadedAt,
            user.PaymentMethod
        ));
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var authHeader = Request.Headers.Authorization.ToString();
        string? token = null;

        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = authHeader.Substring("Bearer ".Length).Trim();
        }

        var payload = _tokenService.ValidateToken(token);
        if (payload == null)
        {
            return Unauthorized(new { error = "Missing, expired, or invalid authorization token." });
        }

        var user = await _context.Users
            .Include(u => u.Entries)
            .FirstOrDefaultAsync(u => u.Id == payload.UserId);

        if (user == null)
        {
            return NotFound(new { error = "User account not found." });
        }

        var activeEntries = user.Entries.Where(e => !e.IsHidden).ToList();
        var bestEntry = activeEntries.OrderByDescending(e => e.OverallScore).FirstOrDefault();

        return Ok(new
        {
            user.Id,
            user.Email,
            user.FullName,
            user.Role,
            user.LeaderboardPaid,
            user.QuizPaid,
            user.PaymentMethod,
            user.AmountPaid,
            user.PaidAt,
            user.CleanShaveImageUrl,
            user.CleanShaveUploadedAt,
            user.CreatedAt,
            totalSubmissions = activeEntries.Count,
            bestScore = bestEntry?.OverallScore ?? 0,
            bestMustacheTitle = bestEntry?.MustacheTitle,
            bestThumbnailUrl = bestEntry?.ThumbnailUrl
        });
    }

    [HttpGet("offices")]
    public IActionResult GetOffices()
    {
        return Ok(Array.Empty<string>());
    }
}
