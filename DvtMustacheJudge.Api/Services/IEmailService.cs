namespace DvtMustacheJudge.Api.Services;

public interface IEmailService
{
    /// <summary>
    /// Sends a branded HTML password reset email containing the secure reset URL.
    /// </summary>
    Task<bool> SendPasswordResetEmailAsync(string toEmail, string toName, string resetUrl, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sends a generic email with both plain text and HTML representation.
    /// </summary>
    Task<bool> SendEmailAsync(string toEmail, string toName, string subject, string textContent, string htmlContent, CancellationToken cancellationToken = default);
}
