using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DvtMustacheJudge.Api.Models;

namespace DvtMustacheJudge.Api.Services;

public interface ITokenService
{
    string GenerateToken(User user, TimeSpan? validity = null);
    TokenPayload? ValidateToken(string? token);
}

public record TokenPayload(Guid UserId, string Email, string Role, DateTime ExpiresAt);

public class TokenService : ITokenService
{
    private readonly byte[] _secretKeyBytes;

    public TokenService(IConfiguration config)
    {
        var secret = Environment.GetEnvironmentVariable("JWT_SECRET")
                     ?? config["JWT_SECRET"]
                     ?? config["Jwt:Secret"];

        if (string.IsNullOrWhiteSpace(secret))
        {
            throw new InvalidOperationException("Fatal Startup Error: Required environment variable 'JWT_SECRET' is not configured. The service will not start without a secure token secret provided in environment variables.");
        }

        if (secret.Length < 32)
        {
            throw new InvalidOperationException("Fatal Startup Error: 'JWT_SECRET' environment variable must be at least 32 characters long for cryptographic security.");
        }

        _secretKeyBytes = Encoding.UTF8.GetBytes(secret);
    }

    public string GenerateToken(User user, TimeSpan? validity = null)
    {
        var expiresAt = DateTime.UtcNow.Add(validity ?? TimeSpan.FromDays(30));
        var payload = new TokenPayload(user.Id, user.Email, user.Role, expiresAt);
        var jsonPayload = JsonSerializer.Serialize(payload);
        var payloadBytes = Encoding.UTF8.GetBytes(jsonPayload);
        var payloadBase64 = Convert.ToBase64String(payloadBytes)
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

        using var hmac = new HMACSHA256(_secretKeyBytes);
        var signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadBase64));
        var signatureBase64 = Convert.ToBase64String(signatureBytes)
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

        return $"{payloadBase64}.{signatureBase64}";
    }

    public TokenPayload? ValidateToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;

        var parts = token.Split('.');
        if (parts.Length != 2) return null;

        var payloadBase64 = parts[0];
        var signatureBase64 = parts[1];

        using var hmac = new HMACSHA256(_secretKeyBytes);
        var expectedSigBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadBase64));
        var expectedSigBase64 = Convert.ToBase64String(expectedSigBytes)
            .Replace("+", "-").Replace("/", "_").TrimEnd('=');

        if (!CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(signatureBase64),
            Encoding.UTF8.GetBytes(expectedSigBase64)))
        {
            return null;
        }

        try
        {
            var padded = payloadBase64.Replace("-", "+").Replace("_", "/");
            switch (padded.Length % 4)
            {
                case 2: padded += "=="; break;
                case 3: padded += "="; break;
            }
            var jsonPayload = Encoding.UTF8.GetString(Convert.FromBase64String(padded));
            var payload = JsonSerializer.Deserialize<TokenPayload>(jsonPayload);

            if (payload == null || payload.ExpiresAt < DateTime.UtcNow)
            {
                return null;
            }

            return payload;
        }
        catch
        {
            return null;
        }
    }
}
