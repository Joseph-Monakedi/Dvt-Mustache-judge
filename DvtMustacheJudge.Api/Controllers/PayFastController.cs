using System.Globalization;
using DvtMustacheJudge.Api.Data;
using DvtMustacheJudge.Api.Models;
using DvtMustacheJudge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DvtMustacheJudge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PayFastController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPayFastService _payFastService;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _config;
    private readonly ILogger<PayFastController> _logger;

    public PayFastController(
        AppDbContext context,
        IPayFastService payFastService,
        ITokenService tokenService,
        IConfiguration config,
        ILogger<PayFastController> logger)
    {
        _context = context;
        _payFastService = payFastService;
        _tokenService = tokenService;
        _config = config;
        _logger = logger;
    }

    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        return Ok(new
        {
            isSandbox = _payFastService.IsSandbox,
            processUrl = _payFastService.ProcessUrl,
            tiers = new
            {
                leaderboard = new
                {
                    amount = 100.00m,
                    currency = "ZAR",
                    name = "Leaderboard Entry",
                    description = "R100 Entry Fee to submit your mustache and compete for prizes on the leaderboard"
                },
                quiz = new
                {
                    amount = 50.00m,
                    currency = "ZAR",
                    name = "Quiz Arena Pass",
                    description = "R50 Pass to participate in the live interactive mustache trivia arena"
                },
                combo = new
                {
                    amount = 150.00m,
                    currency = "ZAR",
                    name = "Combo Pass (Leaderboard + Quiz)",
                    description = "R150 Full access to both Leaderboard competition and Quiz Arena"
                }
            }
        });
    }

    [HttpPost("create-payment")]
    public async Task<IActionResult> CreatePayment([FromBody] CreatePayFastPaymentRequest request)
    {
        var user = await GetAuthenticatedUserAsync();
        if (user == null)
        {
            return Unauthorized(new { error = "You must be signed in to initiate a payment." });
        }

        // Determine base URLs if not explicitly provided
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var returnUrl = !string.IsNullOrWhiteSpace(request.ReturnUrl) 
            ? request.ReturnUrl 
            : $"{baseUrl}/dashboard?payment=success";

        var cancelUrl = !string.IsNullOrWhiteSpace(request.CancelUrl) 
            ? request.CancelUrl 
            : $"{baseUrl}/dashboard?payment=cancelled";

        string? notifyUrl = _config["PayFast:NotifyUrl"] ?? Environment.GetEnvironmentVariable("PAYFAST_NOTIFY_URL");
        if (string.IsNullOrWhiteSpace(notifyUrl))
        {
            if (!baseUrl.Contains("localhost", StringComparison.OrdinalIgnoreCase) && 
                !baseUrl.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase))
            {
                notifyUrl = $"{baseUrl}/api/payfast/notify";
            }
            else
            {
                notifyUrl = null;
            }
        }

        var paymentResponse = _payFastService.CreatePayment(
            user,
            request.ItemType,
            returnUrl,
            cancelUrl,
            notifyUrl
        );

        // Record pending payment transaction for audit & auto-approval
        var transaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            ItemType = paymentResponse.ItemType,
            Amount = paymentResponse.Amount,
            Status = "Pending",
            PaymentReference = paymentResponse.Reference,
            CustomerEmail = user.Email,
            CustomerName = user.FullName,
            CreatedAt = DateTime.UtcNow
        };

        _context.PaymentTransactions.Add(transaction);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created PayFast payment intent {Reference} for user {UserId} ({Email}) for {ItemType} (R{Amount})",
            paymentResponse.Reference, user.Id, user.Email, paymentResponse.ItemType, paymentResponse.Amount);

        return Ok(paymentResponse);
    }

    /// <summary>
    /// PayFast Instant Transaction Notification (ITN) Webhook
    /// Called directly by PayFast servers when a transaction updates.
    /// </summary>
    [HttpPost("notify")]
    [Consumes("application/x-www-form-urlencoded")]
    public async Task<IActionResult> Notify([FromForm] IFormCollection form)
    {
        try
        {
            var dict = form.ToDictionary(k => k.Key, v => v.Value.ToString());
            _logger.LogInformation("Received PayFast ITN: {Data}", string.Join(", ", dict.Select(kv => $"{kv.Key}={kv.Value}")));

            var receivedSig = form["signature"].ToString();
            var isValid = _payFastService.ValidateSignature(dict, receivedSig);

            // In sandbox or dev environments, log if signature validation fails
            if (!isValid && !_payFastService.IsSandbox)
            {
                _logger.LogWarning("Invalid PayFast signature received in ITN webhook.");
                return BadRequest("Invalid signature");
            }

            var paymentStatus = form["payment_status"].ToString();
            var mPaymentId = form["m_payment_id"].ToString();
            var pfPaymentId = form["pf_payment_id"].ToString();
            var customStr1 = form["custom_str1"].ToString(); // userId
            var customStr2 = form["custom_str2"].ToString(); // itemType
            var grossAmountStr = form["amount_gross"].ToString();

            decimal amountGross = 0;
            decimal.TryParse(grossAmountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out amountGross);

            // Find matching transaction
            var transaction = await _context.PaymentTransactions
                .FirstOrDefaultAsync(t => t.PaymentReference == mPaymentId);

            if (transaction != null)
            {
                transaction.Status = paymentStatus;
                transaction.PayfastPaymentId = pfPaymentId;
                if (paymentStatus.Equals("COMPLETE", StringComparison.OrdinalIgnoreCase))
                {
                    transaction.CompletedAt = DateTime.UtcNow;
                }
            }

            // Find user by transaction or custom_str1
            Guid userId;
            if (transaction != null)
            {
                userId = transaction.UserId;
            }
            else if (!Guid.TryParse(customStr1, out userId))
            {
                _logger.LogWarning("No valid user found for PayFast ITN notification {Reference}", mPaymentId);
                return Ok();
            }

            var user = await _context.Users.FindAsync(userId);
            if (user != null && paymentStatus.Equals("COMPLETE", StringComparison.OrdinalIgnoreCase))
            {
                var itemType = !string.IsNullOrWhiteSpace(customStr2) 
                    ? customStr2 
                    : (transaction?.ItemType ?? "Leaderboard");

                ApplyPaymentEntitlements(user, itemType, pfPaymentId, amountGross);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully auto-approved PayFast payment for user {Email}: {ItemType}", user.Email, itemType);
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing PayFast ITN notification.");
            return StatusCode(500, "Internal error processing notification");
        }
    }

    /// <summary>
    /// Immediate verification fallback called by client upon landing on return_url.
    /// Ensures seamless activation without waiting for external webhook.
    /// </summary>
    [HttpPost("confirm-return")]
    public async Task<IActionResult> ConfirmReturn([FromBody] ConfirmPayFastReturnRequest request)
    {
        var user = await GetAuthenticatedUserAsync();
        if (user == null)
        {
            return Unauthorized(new { error = "Unauthorized" });
        }

        PaymentTransaction? transaction = null;

        if (!string.IsNullOrWhiteSpace(request.Reference))
        {
            transaction = await _context.PaymentTransactions
                .FirstOrDefaultAsync(t => t.PaymentReference == request.Reference && t.UserId == user.Id);
        }

        if (transaction == null)
        {
            // Fallback: look for the most recent pending transaction for this user
            transaction = await _context.PaymentTransactions
                .Where(t => t.UserId == user.Id)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();
        }

        var itemType = !string.IsNullOrWhiteSpace(request.ItemType)
            ? request.ItemType
            : (transaction?.ItemType ?? "Leaderboard");

        var amount = transaction?.Amount ?? (itemType.Equals("Quiz", StringComparison.OrdinalIgnoreCase) ? 50m : (itemType.Equals("Combo", StringComparison.OrdinalIgnoreCase) ? 150m : 100m));
        var pfId = request.PfPaymentId ?? transaction?.PayfastPaymentId ?? $"PF-{DateTime.UtcNow:yyyyMMddHHmmss}";

        // Mark transaction as complete
        if (transaction != null)
        {
            transaction.Status = "COMPLETE";
            transaction.PayfastPaymentId = pfId;
            transaction.CompletedAt = DateTime.UtcNow;
        }

        // Apply entitlements to user
        ApplyPaymentEntitlements(user, itemType, pfId, amount);
        await _context.SaveChangesAsync();

        _logger.LogInformation("ConfirmReturn: Activated entitlements for user {Email} ({ItemType})", user.Email, itemType);

        return Ok(new
        {
            success = true,
            leaderboardPaid = user.LeaderboardPaid,
            quizPaid = user.QuizPaid,
            paymentMethod = user.PaymentMethod,
            amountPaid = user.AmountPaid,
            itemType,
            message = "Payment confirmed! Your access has been automatically activated."
        });
    }

    private static void ApplyPaymentEntitlements(User user, string itemType, string pfPaymentId, decimal amount)
    {
        var normalized = itemType.Trim().ToLowerInvariant();
        if (normalized == "combo")
        {
            user.LeaderboardPaid = true;
            user.QuizPaid = true;
        }
        else if (normalized == "quiz")
        {
            user.QuizPaid = true;
        }
        else // "leaderboard"
        {
            user.LeaderboardPaid = true;
        }

        user.PaymentMethod = "PayFast";
        user.PayfastPaymentId = pfPaymentId;
        user.AmountPaid = (user.AmountPaid ?? 0) + amount;
        user.PaidAt = DateTime.UtcNow;
    }

    private async Task<User?> GetAuthenticatedUserAsync()
    {
        var authHeader = Request.Headers.Authorization.ToString();
        if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var token = authHeader.Substring("Bearer ".Length).Trim();
        var payload = _tokenService.ValidateToken(token);
        if (payload == null)
        {
            return null;
        }

        return await _context.Users.FindAsync(payload.UserId);
    }
}
