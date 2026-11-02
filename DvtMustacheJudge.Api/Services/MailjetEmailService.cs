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

        // 1. Try Gmail HTTPS Webhook (Google Apps Script Web App over port 443) if configured.
        //    Works on Render Free tier (port 443 HTTPS) and dispatches natively via Google's
        //    Gmail infrastructure with full SPF, DKIM, and DMARC alignment.
        var webhookUrl = Environment.GetEnvironmentVariable("GMAIL_WEBHOOK_URL")
            ?? _config["Email:WebhookUrl"]
            ?? _config["Smtp:WebhookUrl"];

        if (!string.IsNullOrWhiteSpace(webhookUrl)
            && !webhookUrl.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase)
            && webhookUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            var webhookSent = await SendViaWebhookAsync(
                webhookUrl.Trim(),
                toEmail,
                safeRecipientName,
                subject,
                textContent,
                htmlContent,
                cancellationToken);

            if (webhookSent)
            {
                return true;
            }

            _logger.LogWarning("Gmail HTTPS webhook delivery failed for {Email}. Checking fallback...", toEmail);
        }

        // 2. Try Authenticated SMTP if configured AND not running on Render
        //    (Render blocks outbound TCP ports 25, 465, and 587 on Free/Starter web services,
        //    which caused a 15-second socket connect timeout on every password reset).
        var isRenderInstance = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("RENDER"));
        var smtpHost = _config["Smtp:Host"] ?? Environment.GetEnvironmentVariable("SMTP_HOST");
        var smtpUsername = _config["Smtp:Username"] ?? Environment.GetEnvironmentVariable("SMTP_USERNAME");
        var smtpPassword = _config["Smtp:Password"] ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD");

        var isSmtpConfigured = !isRenderInstance
            && !string.IsNullOrWhiteSpace(smtpHost)
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

        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(payload);
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{apiKey}:{secretKey}"));

        for (int attempt = 1; attempt <= 2; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.mailjet.com/v3.1/send")
                {
                    Version = HttpVersion.Version11,
                    VersionPolicy = HttpVersionPolicy.RequestVersionExact,
                    Content = new SmallPacketJsonContent(jsonBytes)
                };
                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
                request.Headers.ExpectContinue = false;
                request.Headers.ConnectionClose = true;

                var response = await _httpClient.SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    cancellationToken);
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Email successfully dispatched via Mailjet to {Email}.", toEmail);
                    return true;
                }

                _logger.LogError(
                    "Mailjet API error ({StatusCode}) on attempt {Attempt} while sending email to {Email}: {Response}",
                    (int)response.StatusCode,
                    attempt,
                    toEmail,
                    responseBody);

                if ((int)response.StatusCode != 408 && (int)response.StatusCode < 500)
                {
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception on attempt {Attempt} while sending email via Mailjet to {Email}.", attempt, toEmail);
                if (attempt == 2)
                {
                    return false;
                }
            }
        }

        return false;
    }

    private async Task<bool> SendViaWebhookAsync(
        string webhookUrl,
        string recipientEmail,
        string recipientName,
        string subject,
        string textContent,
        string htmlContent,
        CancellationToken cancellationToken)
    {
        try
        {
            var senderName = _config["Smtp:SenderName"]
                ?? _config["Mailjet:SenderName"]
                ?? Environment.GetEnvironmentVariable("MAILJET_SENDER_NAME")
                ?? "DVT Movember 2026";

            var webhookPayload = new
            {
                to = recipientEmail,
                toName = recipientName,
                subject,
                text = textContent,
                html = htmlContent,
                senderName
            };

            var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(webhookPayload);
            using var request = new HttpRequestMessage(HttpMethod.Post, webhookUrl)
            {
                Content = new SmallPacketJsonContent(jsonBytes)
            };

            var response = await _httpClient.SendAsync(request, cancellationToken);

            // Google Apps Script Web Apps execute doPost(e) synchronously and then return
            // either 200 OK (after redirect to script.googleusercontent.com) or 302 Found.
            if (response.IsSuccessStatusCode || (int)response.StatusCode is 301 or 302 or 303 or 307)
            {
                _logger.LogInformation("Email successfully dispatched via Gmail HTTPS webhook to {Email}.", recipientEmail);
                return true;
            }

            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError(
                "Gmail HTTPS webhook returned status {StatusCode} for {Email}: {Response}",
                (int)response.StatusCode,
                recipientEmail,
                errorBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while sending email via Gmail HTTPS webhook to {Email}.", recipientEmail);
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

        return $"<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/></head>" +
               $"<body style=\"margin:0;padding:24px;background:#f4f6f8;font-family:Arial,sans-serif;color:#1e293b;\">" +
               $"<div style=\"max-width:500px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;\">" +
               $"<div style=\"background:#0b1622;padding:18px 24px;border-bottom:3px solid #007fba;\">" +
               $"<div style=\"font-size:11px;font-weight:700;text-transform:uppercase;color:#7dd3fc;\">DVT Movember 2026</div>" +
               $"<h1 style=\"margin:4px 0 0;font-size:18px;color:#ffffff;\">Password Reset Request</h1></div>" +
               $"<div style=\"padding:24px;\">" +
               $"<p style=\"margin:0 0 14px;font-size:14px;line-height:1.5;\">Hello <strong>{encodedName}</strong>,</p>" +
               $"<p style=\"margin:0 0 20px;font-size:14px;line-height:1.5;\">We received a request to reset the password for your DVT Movember account (<strong>{encodedEmail}</strong>).</p>" +
               $"<p style=\"text-align:center;margin:24px 0;\"><a href=\"{encodedUrl}\" style=\"display:inline-block;background:#007fba;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:6px;\">Reset My Password</a></p>" +
               $"<p style=\"margin:0 0 14px;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;\">Or copy and paste this link into your browser:<br/><span style=\"color:#007fba;\">{encodedUrl}</span></p>" +
               $"<p style=\"margin:16px 0 0;font-size:12px;color:#64748b;\">This link is valid for 2 hours. If you did not request a reset, you can safely ignore this email.</p>" +
               $"</div></div></body></html>";
    }

    /// <summary>
    /// Writes JSON bytes in small 512-byte flushed TLS records so that no single TCP packet
    /// exceeds cloud container / overlay network Path MTU limits (which otherwise cause
    /// HAProxy on api.mailjet.com to time out with HTTP 408 waiting for dropped 1500-byte segments).
    /// </summary>
    private sealed class SmallPacketJsonContent : HttpContent
    {
        private readonly byte[] _bytes;

        public SmallPacketJsonContent(byte[] bytes)
        {
            _bytes = bytes;
            Headers.ContentType = new MediaTypeHeaderValue("application/json")
            {
                CharSet = "utf-8"
            };
            Headers.ContentLength = bytes.Length;
        }

        protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context)
        {
            const int chunkSize = 512;
            int offset = 0;
            while (offset < _bytes.Length)
            {
                int count = Math.Min(chunkSize, _bytes.Length - offset);
                await stream.WriteAsync(_bytes.AsMemory(offset, count));
                await stream.FlushAsync();
                offset += count;
            }
        }

        protected override bool TryComputeLength(out long length)
        {
            length = _bytes.Length;
            return true;
        }
    }
}
