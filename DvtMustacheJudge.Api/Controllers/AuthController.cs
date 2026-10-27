using System.Security.Cryptography;
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
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext context,
        ITokenService tokenService,
        IEmailService emailService,
        IConfiguration config,
        ILogger<AuthController> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _emailService = emailService;
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

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (user != null)
        {
            // Generate secure random 32-byte hex token
            var tokenBytes = RandomNumberGenerator.GetBytes(32);
            var token = Convert.ToHexString(tokenBytes).ToLowerInvariant();

            user.PasswordResetToken = token;
            user.PasswordResetTokenExpiresAt = DateTime.UtcNow.AddHours(2);
            await _context.SaveChangesAsync();

            // Determine client base URL
            var configuredUrl = _config["ClientUrl"] 
                                ?? _config["AppUrl"] 
                                ?? Environment.GetEnvironmentVariable("CLIENT_URL") 
                                ?? Environment.GetEnvironmentVariable("APP_URL");

            string origin = configuredUrl?.Trim() ?? "";

            if (string.IsNullOrWhiteSpace(origin))
            {
                origin = Request.Headers.Origin.ToString();
            }

            if (string.IsNullOrWhiteSpace(origin))
            {
                var referer = Request.Headers.Referer.ToString();
                if (!string.IsNullOrWhiteSpace(referer) && Uri.TryCreate(referer, UriKind.Absolute, out var refererUri))
                {
                    origin = $"{refererUri.Scheme}://{refererUri.Authority}";
                }
            }

            if (string.IsNullOrWhiteSpace(origin))
            {
                var scheme = Request.Scheme;
                var proto = Request.Headers["X-Forwarded-Proto"].ToString();
                if (!string.IsNullOrWhiteSpace(proto))
                {
                    scheme = proto;
                }
                origin = $"{scheme}://{Request.Host.Value}";
            }

            // In production/Render, if host is non-localhost force https
            if (!origin.Contains("localhost") && !origin.Contains("127.0.0.1") && origin.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
            {
                origin = "https://" + origin.Substring("http://".Length);
            }

            var resetUrl = $"{origin.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(user.Email)}";

            _logger.LogInformation("Password reset requested for {Email}. Sending reset email...", user.Email);
            await _emailService.SendPasswordResetEmailAsync(user.Email, user.FullName, resetUrl);
        }
        else
        {
            _logger.LogInformation("Password reset requested for non-existent email: {Email}", normalizedEmail);
        }

        // Return same response to prevent user email enumeration
        return Ok(new
        {
            message = "If an account exists with this email address, a password reset link has been sent. Please make sure to check your spam or junk folder."
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (user == null || 
            string.IsNullOrWhiteSpace(user.PasswordResetToken) || 
            !string.Equals(user.PasswordResetToken, request.Token, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Invalid or expired password reset link. Please request a new one." });
        }

        if (user.PasswordResetTokenExpiresAt == null || user.PasswordResetTokenExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new { error = "This password reset link has expired (links are valid for 2 hours). Please request a new reset link." });
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            return BadRequest(new { error = "Password must be at least 6 characters long." });
        }

        var (hash, salt) = PasswordHasher.HashPassword(request.NewPassword);
        user.PasswordHash = hash;
        user.Salt = salt;
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiresAt = null;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Password successfully reset for user: {Email}", user.Email);

        return Ok(new
        {
            message = "Your password has been successfully reset. You can now log in with your new password."
        });
    }
}
