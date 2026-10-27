using System.Net.Http.Headers;
using System.Text;
using System.Text.Encodings.Web;
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
        var displayName = string.IsNullOrWhiteSpace(toName) ? "Contestant" : toName.Trim();
        var subject = "Reset Your DVT Movember 2026 Password";

        var plainText = $@"Hi {displayName},

We received a request to reset the password for your DVT Movember 2026 account.

Please use the following secure link to choose a new password:
{resetUrl}

This link is valid for 2 hours. If you did not request a password reset, you can safely ignore this email.

*** IMPORTANT - PLEASE CHECK YOUR SPAM / JUNK FOLDER ***
Automated messages can sometimes be routed to Spam or Junk folders. If this email landed in your spam folder, please mark it as 'Not Spam' or move it to your Primary Inbox to ensure you don't miss future competition verdicts, awards, and quiz notifications!

Best regards,
The DVT Movember 2026 Team";

        var htmlContent = BuildPasswordResetHtmlTemplate(displayName, resetUrl);

        return await SendEmailAsync(toEmail, displayName, subject, plainText, htmlContent, cancellationToken);
    }

    public async Task<bool> SendEmailAsync(
        string toEmail,
        string toName,
        string subject,
        string textContent,
        string htmlContent,
        CancellationToken cancellationToken = default)
    {
        var apiKey = _config["Mailjet:ApiKey"]
                     ?? Environment.GetEnvironmentVariable("MAILJET_API_KEY");
        var secretKey = _config["Mailjet:SecretKey"]
                        ?? Environment.GetEnvironmentVariable("MAILJET_SECRET_KEY");
        var senderEmail = _config["Mailjet:SenderEmail"]
                          ?? Environment.GetEnvironmentVariable("MAILJET_SENDER_EMAIL")
                          ?? "no-reply@dvt.co.za";
        var senderName = _config["Mailjet:SenderName"]
                         ?? Environment.GetEnvironmentVariable("MAILJET_SENDER_NAME")
                         ?? "DVT Movember 2026";

        // If Mailjet is not configured or uses placeholder credentials, log simulated email
        if (string.IsNullOrWhiteSpace(apiKey) || 
            string.IsNullOrWhiteSpace(secretKey) || 
            apiKey.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "[Mailjet Simulation] Mailjet API credentials are not set or using placeholders. " +
                "Simulating email dispatch to: {ToEmail} ({ToName}) | Subject: {Subject}",
                toEmail, toName, subject);

            return true;
        }

        try
        {
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
                                Name = string.IsNullOrWhiteSpace(toName) ? toEmail : toName
                            }
                        },
                        Subject = subject,
                        TextPart = textContent,
                        HTMLPart = htmlContent
                    }
                }
            };

            var requestJson = JsonSerializer.Serialize(payload);
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.mailjet.com/v3.1/send");
            
            var authHeaderValue = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{apiKey}:{secretKey}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeaderValue);
            request.Content = new StringContent(requestJson, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Password reset email sent successfully via Mailjet to {ToEmail}", toEmail);
                return true;
            }

            _logger.LogError(
                "Mailjet email dispatch failed with status {StatusCode}: {ResponseBody}",
                response.StatusCode, responseBody);

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error attempting to send email via Mailjet to {ToEmail}: {Message}", toEmail, ex.Message);
            return false;
        }
    }

    private static string BuildPasswordResetHtmlTemplate(string displayName, string resetUrl)
    {
        var safeName = HtmlEncoder.Default.Encode(displayName);
        var safeUrl = HtmlEncoder.Default.Encode(resetUrl);

        return $@"<!DOCTYPE html>
<html lang=""en"">
<head>
  <meta charset=""UTF-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>Reset Your Password - DVT Movember 2026</title>
  <style>
    body, table, td, p, a, li, blockquote {{
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }}
    table, td {{
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }}
    img {{
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }}
  </style>
</head>
<body style=""margin: 0; padding: 0; background-color: #070c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;"">
  <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #070c14; min-height: 100vh; padding: 40px 16px;"">
    <tr>
      <td align=""center"">
        <!-- Main Container Card -->
        <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""max-width: 580px; background-color: #0d1522; border-radius: 18px; border: 1px solid rgba(0, 180, 216, 0.35); box-shadow: 0 20px 45px rgba(0,0,0,0.7), 0 0 35px rgba(0,180,216,0.12); overflow: hidden;"">
          
          <!-- Header Banner -->
          <tr>
            <td style=""background: linear-gradient(135deg, #091321 0%, #0d1e34 100%); padding: 36px 32px 24px 32px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08);"">
              <div style=""display: inline-block; width: 64px; height: 64px; line-height: 64px; border-radius: 50%; background: linear-gradient(135deg, rgba(0,180,216,0.25), rgba(0,119,182,0.4)); border: 1px solid #00b4d8; margin-bottom: 16px;"">
                <span style=""font-size: 32px;"">🧔</span>
              </div>
              <h1 style=""margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;"">
                DVT MOVEMBER <span style=""color: #00b4d8;"">2026</span>
              </h1>
              <p style=""margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px;"">
                Official Mustache Judge & Quiz Arena
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style=""padding: 36px 32px 28px 32px;"">
              <h2 style=""margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #ffffff;"">
                Password Reset Request
              </h2>
              
              <p style=""margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;"">
                Hi <strong style=""color: #00b4d8;"">{safeName}</strong>,
              </p>
              
              <p style=""margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;"">
                We received a request to reset the password for your DVT Movember account. Click the button below to securely choose a new password:
              </p>

              <!-- CTA Button -->
              <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""margin: 28px 0;"">
                <tr>
                  <td align=""center"">
                    <a href=""{safeUrl}"" target=""_blank"" style=""display: inline-block; padding: 15px 36px; background: linear-gradient(135deg, #00b4d8 0%, #0077b6 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 10px; box-shadow: 0 6px 20px rgba(0, 180, 216, 0.4); text-transform: uppercase; letter-spacing: 0.5px;"">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct URL -->
              <div style=""background-color: #080d16; border-radius: 10px; padding: 16px; border: 1px solid rgba(255,255,255,0.06); margin: 24px 0;"">
                <p style=""margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 600;"">
                  If the button doesn't work, copy and paste this URL into your browser:
                </p>
                <p style=""margin: 0; font-size: 13px; color: #38bdf8; word-break: break-all; line-height: 1.4;"">
                  <a href=""{safeUrl}"" style=""color: #38bdf8; text-decoration: underline;"">{safeUrl}</a>
                </p>
              </div>

              <!-- SPAM FOLDER CALLOUT BOX -->
              <div style=""background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px 18px; margin: 28px 0;"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
                  <tr>
                    <td valign=""top"" style=""width: 28px; font-size: 20px; line-height: 1;"">
                      ⚠️
                    </td>
                    <td style=""padding-left: 8px;"">
                      <strong style=""display: block; font-size: 14px; color: #fbbf24; margin-bottom: 4px;"">
                        Important: Please Check Your Spam / Junk Folder!
                      </strong>
                      <p style=""margin: 0; font-size: 13px; line-height: 1.5; color: #fef3c7;"">
                        Automated security emails can sometimes be filtered by email providers into Spam or Junk folders. If this message landed in your spam folder, please mark it as <strong>&ldquo;Report Not Spam&rdquo;</strong> or move it to your <strong>Primary Inbox</strong> to ensure you receive future competition updates, AI judging verdicts, and live quiz notifications without delay.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Expiration Note -->
              <p style=""margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;"">
                🕒 This reset link will expire in <strong>2 hours</strong> for your security. If you did not request this password change, no action is required and your account remains safe.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style=""background-color: #080d16; padding: 24px 32px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);"">
              <p style=""margin: 0 0 6px 0; font-size: 12px; color: #94a3b8; font-weight: 600;"">
                DVT Movember 2026 • Celebrating facial hair for a great cause
              </p>
              <p style=""margin: 0; font-size: 11px; color: #475569;"">
                Dynamic Visual Technologies (Pty) Ltd. • All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }
}
