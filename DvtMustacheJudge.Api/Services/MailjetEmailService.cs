using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using System.Text.Json;

namespace DvtMustacheJudge.Api.Services;

public class MailjetEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<MailjetEmailService> _logger;

    public MailjetEmailService(
        HttpClient httpClient,
        IConfiguration config,
        ILogger<MailjetEmailService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public async Task<bool> SendPasswordResetEmailAsync(
        string toEmail,
        string toName,
        string resetUrl,
        CancellationToken cancellationToken = default)
    {
        var safeRecipientName = string.IsNullOrWhiteSpace(toName) ? "Contestant" : toName;
        var subject = "DVT Movember 2026: Reset Your Account Password";

        var textContent = $"""
            Hello {safeRecipientName},

            We received a request to reset the password for your DVT Movember 2026 account ({toEmail}).

            To set a new password, open the secure link below within the next 30 minutes:
            {resetUrl}

            If you did not request a password reset, you can safely ignore this email and your account password will remain unchanged.

            Kind regards,
            DVT Movember 2026 Team
            """;

        var htmlContent = BuildPasswordResetHtmlTemplate(safeRecipientName, toEmail, resetUrl);

        return await SendEmailAsync(toEmail, safeRecipientName, subject, textContent, htmlContent, cancellationToken);
    }

    public async Task<bool> SendEmailAsync(
        string toEmail,
        string toName,
        string subject,
        string textContent,
        string htmlContent,
        CancellationToken cancellationToken = default)
    {
        var safeRecipientName = string.IsNullOrWhiteSpace(toName) ? "Contestant" : toName;

        // 1. Try Authenticated SMTP first if configured (e.g., Gmail App Password or Office 365 SMTP).
        //    Sending via authenticated SMTP ensures SPF/DKIM/DMARC alignment for the sender domain
        //    so Microsoft Defender / Outlook and Gmail do not reject or quarantine the message.
        var smtpHost = _config["Smtp:Host"] ?? Environment.GetEnvironmentVariable("SMTP_HOST");
        var smtpUsername = _config["Smtp:Username"] ?? Environment.GetEnvironmentVariable("SMTP_USERNAME");
        var smtpPassword = _config["Smtp:Password"] ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD");

        var isSmtpConfigured = !string.IsNullOrWhiteSpace(smtpHost)
            && !string.IsNullOrWhiteSpace(smtpUsername)
            && !string.IsNullOrWhiteSpace(smtpPassword)
            && !smtpHost.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase)
            && !smtpUsername.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase)
            && !smtpPassword.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase);

        if (isSmtpConfigured)
        {
            var smtpSent = await SendViaSmtpAsync(
                smtpHost!,
                smtpUsername!,
                smtpPassword!,
                toEmail,
                safeRecipientName,
                subject,
                textContent,
                htmlContent,
                cancellationToken);

            if (smtpSent)
            {
                return true;
            }

            _logger.LogWarning("SMTP delivery failed for {Email}. Checking Mailjet fallback...", toEmail);
        }

        // 2. Fallback to Mailjet Send API v3.1
        var apiKey = _config["Mailjet:ApiKey"] ?? Environment.GetEnvironmentVariable("MAILJET_API_KEY");
        var secretKey = _config["Mailjet:SecretKey"] ?? Environment.GetEnvironmentVariable("MAILJET_SECRET_KEY");
        var senderEmail = _config["Mailjet:SenderEmail"]
            ?? Environment.GetEnvironmentVariable("MAILJET_SENDER_EMAIL")
            ?? "no-reply@dvt.co.za";
        var senderName = _config["Mailjet:SenderName"]
            ?? Environment.GetEnvironmentVariable("MAILJET_SENDER_NAME")
            ?? "DVT Movember 2026";

        var isPlaceholderKey = string.IsNullOrWhiteSpace(apiKey)
            || string.IsNullOrWhiteSpace(secretKey)
            || apiKey.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase)
            || secretKey.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase);

        if (isPlaceholderKey)
        {
            _logger.LogWarning(
                "====================================================================\n" +
                "[EMAIL DEV FALLBACK] Neither SMTP nor Mailjet credentials are configured.\n" +
                "Recipient : {Email} ({Name})\n" +
                "Subject   : {Subject}\n" +
                "Body      : {TextContent}\n" +
                "====================================================================",
                toEmail,
                safeRecipientName,
                subject,
                textContent);
            return false;
        }

        var payload = new
        {
            Messages = new[]
            {
                new
                {
                    From = new
                    {
                        Email = senderEmail,
                        Name = senderName
                    },
                    To = new[]
                    {
                        new
                        {
                            Email = toEmail,
                            Name = safeRecipientName
                        }
                    },
                    Subject = subject,
                    TextPart = textContent,
                    HTMLPart = htmlContent,
                    TrackClicks = "disabled",
                    TrackOpens = "disabled"
                }
            }
        };

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.mailjet.com/v3.1/send");
            var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{apiKey}:{secretKey}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError(
                    "Mailjet API error ({StatusCode}) while sending email to {Email}: {Response}",
                    (int)response.StatusCode,
                    toEmail,
                    responseBody);
                return false;
            }

            _logger.LogInformation("Email successfully dispatched via Mailjet to {Email}.", toEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while sending email via Mailjet to {Email}.", toEmail);
            return false;
        }
    }

    private async Task<bool> SendViaSmtpAsync(
        string host,
        string username,
        string password,
        string recipientEmail,
        string recipientName,
        string subject,
        string textContent,
        string htmlContent,
        CancellationToken cancellationToken)
    {
        try
        {
            var portRaw = _config["Smtp:Port"] ?? Environment.GetEnvironmentVariable("SMTP_PORT");
            var port = int.TryParse(portRaw, out var parsedPort) ? parsedPort : 587;

            var senderEmail = _config["Smtp:SenderEmail"]
                ?? Environment.GetEnvironmentVariable("SMTP_SENDER_EMAIL")
                ?? username;
            var senderName = _config["Smtp:SenderName"]
                ?? Environment.GetEnvironmentVariable("SMTP_SENDER_NAME")
                ?? "DVT Movember 2026";

            using var message = new MailMessage
            {
                From = new MailAddress(senderEmail, senderName, Encoding.UTF8),
                Subject = subject,
                SubjectEncoding = Encoding.UTF8,
                Body = textContent,
                BodyEncoding = Encoding.UTF8,
                IsBodyHtml = false
            };

            message.To.Add(new MailAddress(recipientEmail, recipientName, Encoding.UTF8));
            message.ReplyToList.Add(new MailAddress(senderEmail, senderName, Encoding.UTF8));

            var plainView = AlternateView.CreateAlternateViewFromString(textContent, Encoding.UTF8, MediaTypeNames.Text.Plain);
            var htmlView = AlternateView.CreateAlternateViewFromString(htmlContent, Encoding.UTF8, MediaTypeNames.Text.Html);
            message.AlternateViews.Add(plainView);
            message.AlternateViews.Add(htmlView);

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(username, password.Replace(" ", "")),
                Timeout = 15000
            };

            await client.SendMailAsync(message, cancellationToken);
            _logger.LogInformation("Email successfully dispatched via SMTP ({Host}:{Port}) to {Email}.", host, port, recipientEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while sending email via SMTP ({Host}) to {Email}.", host, recipientEmail);
            return false;
        }
    }

    private static string BuildPasswordResetHtmlTemplate(
        string recipientName,
        string recipientEmail,
        string resetUrl)
    {
        var encodedName = WebUtility.HtmlEncode(recipientName);
        var encodedEmail = WebUtility.HtmlEncode(recipientEmail);
        var encodedUrl = WebUtility.HtmlEncode(resetUrl);

        return $"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>DVT Movember 2026 Password Reset</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 32px 16px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                      <tr>
                        <td style="background-color: #0b1622; padding: 20px 28px; border-bottom: 3px solid #007fba;">
                          <div style="font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7dd3fc; margin-bottom: 4px;">
                            DVT Movember 2026
                          </div>
                          <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                            Password Reset Request
                          </h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 28px;">
                          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
                            Hello <strong>{encodedName}</strong>,
                          </p>
                          <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
                            We received a request to reset the password for your DVT Movember account (<strong>{encodedEmail}</strong>). Click the button below to choose a new password:
                          </p>
                          <div style="text-align: center; margin: 26px 0;">
                            <a href="{encodedUrl}"
                               style="display: inline-block; background-color: #007fba; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 26px; border-radius: 6px;">
                              Reset My Password
                            </a>
                          </div>
                          <p style="margin: 0 0 16px; font-size: 12px; line-height: 1.6; color: #64748b; word-break: break-all;">
                            Or copy and paste this link into your browser:<br />
                            <span style="color: #007fba;">{encodedUrl}</span>
                          </p>
                          <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                            This link is valid for <strong>30 minutes</strong>. If you did not request a password reset, no action is needed and your account remains secure.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: #f8fafc; padding: 16px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
                          <p style="margin: 0; font-size: 12px; color: #64748b;">
                            DVT Movember 2026 Charity Event &bull; Supporting Men's Health Awareness
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
    }
}
