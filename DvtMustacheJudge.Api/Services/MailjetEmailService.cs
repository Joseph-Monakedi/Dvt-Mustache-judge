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
            // CRITICAL: TrackClicks and TrackOpens MUST be "disabled" so Mailjet does not rewrite
            // URLs into mailjet.com/lnk/* tracking redirects, which Brave Shields and ad-blockers block!
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
                        HTMLPart = htmlContent,
                        TrackClicks = "disabled",
                        TrackOpens = "disabled"
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

        return $@"<!DOCTYPE html PUBLIC ""-//W3C//DTD XHTML 1.0 Transitional//EN"" ""http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"">
<html xmlns=""http://www.w3.org/1999/xhtml"" lang=""en"">
<head>
  <meta http-equiv=""Content-Type"" content=""text/html; charset=UTF-8"" />
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
  <meta name=""x-apple-disable-message-reformatting"" />
  <meta name=""format-detection"" content=""telephone=no, address=no, email=no, date=no, url=no"" />
  <meta name=""color-scheme"" content=""dark"" />
  <meta name=""supported-color-schemes"" content=""dark"" />
  <title>Reset Your Password - DVT Movember 2026</title>
  <style type=""text/css"">
    html, body {{
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      width: 100% !important;
      -webkit-text-size-adjust: 100% !important;
      -ms-text-size-adjust: 100% !important;
      background-color: #070c14 !important;
    }}
    table, td {{
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      border-collapse: collapse;
    }}
    img {{
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }}
    a {{
      text-decoration: none;
    }}
    a[x-apple-data-detectors] {{
      color: inherit !important;
      text-decoration: none !important;
      font-size: inherit !important;
      font-family: inherit !important;
      font-weight: inherit !important;
      line-height: inherit !important;
    }}
  </style>
</head>
<body style=""margin: 0; padding: 0; width: 100% !important; background-color: #070c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;"">
  <!-- Outer Table (No min-height: 100vh to avoid iOS Mail infinite scroll rubber-banding) -->
  <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #070c14; width: 100% !important; margin: 0; padding: 0; border-collapse: collapse;"">
    <tr>
      <td align=""center"" style=""padding: 24px 12px; background-color: #070c14;"">
        <!-- Main Container Card -->
        <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""max-width: 580px; width: 100%; margin: 0 auto; background-color: #0d1522; border-radius: 14px; border: 1px solid #00b4d8; border-collapse: separate;"">
          
          <!-- Header Banner -->
          <tr>
            <td align=""center"" style=""background-color: #091321; padding: 32px 24px 22px 24px; text-align: center; border-top-left-radius: 14px; border-top-right-radius: 14px; border-bottom: 1px solid #1e293b;"">
              <div style=""display: inline-block; width: 60px; height: 60px; line-height: 60px; border-radius: 50%; background-color: #0f2438; border: 1px solid #00b4d8; margin-bottom: 12px; text-align: center;"">
                <span style=""font-size: 28px; line-height: 60px;"">🧔</span>
              </div>
              <h1 style=""margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;"">
                DVT MOVEMBER <span style=""color: #00b4d8;"">2026</span>
              </h1>
              <p style=""margin: 6px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px;"">
                Official Mustache Judge & Quiz Arena
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style=""padding: 32px 28px 24px 28px; background-color: #0d1522;"">
              <h2 style=""margin: 0 0 16px 0; font-size: 19px; font-weight: 700; color: #ffffff;"">
                Password Reset Request
              </h2>
              
              <p style=""margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;"">
                Hi <strong style=""color: #00b4d8;"">{safeName}</strong>,
              </p>
              
              <p style=""margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;"">
                We received a request to reset the password for your DVT Movember account. Click the button below to securely choose a new password:
              </p>

              <!-- Bulletproof CTA Button (Works across PC Brave, Gmail, Outlook, Apple Mail) -->
              <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" align=""center"" style=""margin: 28px auto; border-collapse: separate;"">
                <tr>
                  <td align=""center"" bgcolor=""#00b4d8"" style=""border-radius: 8px; background-color: #00b4d8; text-align: center;"">
                    <a href=""{safeUrl}"" target=""_blank"" rel=""noopener noreferrer"" style=""display: inline-block; padding: 16px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: bold; color: #ffffff !important; text-decoration: none !important; border-radius: 8px; background-color: #00b4d8; border: 1px solid #00b4d8; text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer; line-height: 1.2;"">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct URL -->
              <div style=""background-color: #080d16; border-radius: 10px; padding: 14px 16px; border: 1px solid #1e293b; margin: 24px 0;"">
                <p style=""margin: 0 0 8px 0; font-size: 12px; color: #94a3b8; font-weight: 600;"">
                  If the button above does not work in your email client, click or copy this direct link:
                </p>
                <p style=""margin: 0; font-size: 13px; line-height: 1.5; word-break: break-all;"">
                  <a href=""{safeUrl}"" target=""_blank"" rel=""noopener noreferrer"" style=""color: #00b4d8; text-decoration: underline; word-break: break-all;"">{safeUrl}</a>
                </p>
              </div>

              <!-- SPAM FOLDER CALLOUT BOX -->
              <div style=""background-color: #1a160d; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin: 24px 0;"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
                  <tr>
                    <td valign=""top"" style=""width: 24px; font-size: 18px; line-height: 1;"">
                      ⚠️
                    </td>
                    <td style=""padding-left: 8px;"">
                      <strong style=""display: block; font-size: 13px; color: #fbbf24; margin-bottom: 4px;"">
                        Important: Please Check Your Spam / Junk Folder!
                      </strong>
                      <p style=""margin: 0; font-size: 12px; line-height: 1.5; color: #fef3c7;"">
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
            <td align=""center"" style=""background-color: #080d16; padding: 20px 24px; text-align: center; border-bottom-left-radius: 14px; border-bottom-right-radius: 14px; border-top: 1px solid #1e293b;"">
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
