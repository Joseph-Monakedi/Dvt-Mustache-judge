using System.Security.Cryptography;
using System.Text;
using DvtMustacheJudge.Api.Models;

namespace DvtMustacheJudge.Api.Services;

public interface IPayFastService
{
    string ProcessUrl { get; }
    bool IsSandbox { get; }
    CreatePayFastPaymentResponse CreatePayment(
        User user,
        string itemType,
        string? customReturnUrl = null,
        string? customCancelUrl = null,
        string? customNotifyUrl = null);
    bool ValidateSignature(IDictionary<string, string> formFields, string receivedSignature);
}

public class PayFastService : IPayFastService
{
    private readonly IConfiguration _config;
    private readonly ILogger<PayFastService> _logger;

    public PayFastService(IConfiguration config, ILogger<PayFastService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public bool IsSandbox =>
        string.Equals(_config["PayFast:IsSandbox"] ?? Environment.GetEnvironmentVariable("PAYFAST_IS_SANDBOX") ?? "true", "true", StringComparison.OrdinalIgnoreCase);

    public string ProcessUrl => IsSandbox
        ? "https://sandbox.payfast.co.za/eng/process"
        : "https://www.payfast.co.za/eng/process";

    public string MerchantId =>
        _config["PayFast:MerchantId"] ?? Environment.GetEnvironmentVariable("PAYFAST_MERCHANT_ID") ?? (IsSandbox ? "10000100" : "");

    public string MerchantKey =>
        _config["PayFast:MerchantKey"] ?? Environment.GetEnvironmentVariable("PAYFAST_MERCHANT_KEY") ?? (IsSandbox ? "46f0cd694581a" : "");

    public string Passphrase =>
        _config["PayFast:Passphrase"] ?? Environment.GetEnvironmentVariable("PAYFAST_PASSPHRASE") ?? "";

    public CreatePayFastPaymentResponse CreatePayment(
        User user,
        string itemType,
        string? customReturnUrl = null,
        string? customCancelUrl = null,
        string? customNotifyUrl = null)
    {
        // 1. Determine amount & item description
        decimal amount;
        string itemName;
        string normalizedType;

        switch (itemType.ToLowerInvariant())
        {
            case "quiz":
                amount = 50.00m;
                itemName = "DVT Movember 2026 - Quiz Arena Entry Pass";
                normalizedType = "Quiz";
                break;
            case "combo":
                amount = 150.00m;
                itemName = "DVT Movember 2026 - Combo Pass (Leaderboard + Quiz)";
                normalizedType = "Combo";
                break;
            case "leaderboard":
            default:
                amount = 100.00m;
                itemName = "DVT Movember 2026 - Leaderboard Entry";
                normalizedType = "Leaderboard";
                break;
        }

        // 2. Generate Reference
        var reference = $"MO-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";

        // 3. Name parsing
        var nameParts = (user.FullName ?? "Contestant").Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
        var firstName = nameParts.Length > 0 ? nameParts[0] : "Contestant";
        var lastName = nameParts.Length > 1 ? nameParts[1] : "Movember";

        // 4. Construct form fields in strict sequence for PayFast
        var fields = new Dictionary<string, string>
        {
            ["merchant_id"] = MerchantId,
            ["merchant_key"] = MerchantKey
        };

        if (!string.IsNullOrWhiteSpace(customReturnUrl))
            fields["return_url"] = customReturnUrl;

        if (!string.IsNullOrWhiteSpace(customCancelUrl))
            fields["cancel_url"] = customCancelUrl;

        if (!string.IsNullOrWhiteSpace(customNotifyUrl))
            fields["notify_url"] = customNotifyUrl;

        fields["name_first"] = firstName;
        fields["name_last"] = lastName;
        fields["email_address"] = user.Email;
        fields["m_payment_id"] = reference;
        fields["amount"] = amount.ToString("F2");
        fields["item_name"] = itemName;
        fields["custom_str1"] = user.Id.ToString();
        fields["custom_str2"] = normalizedType;

        // 5. Generate signature
        var signature = GenerateSignature(fields, Passphrase);
        fields["signature"] = signature;

        return new CreatePayFastPaymentResponse(
            ProcessUrl,
            fields,
            reference,
            amount,
            normalizedType
        );
    }

    public bool ValidateSignature(IDictionary<string, string> formFields, string receivedSignature)
    {
        if (string.IsNullOrWhiteSpace(receivedSignature))
            return false;

        // Strip signature key if present
        var fieldsWithoutSig = formFields
            .Where(kvp => !string.Equals(kvp.Key, "signature", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(kvp.Value))
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

        var calculated = GenerateSignature(fieldsWithoutSig, Passphrase);
        return string.Equals(calculated, receivedSignature, StringComparison.OrdinalIgnoreCase);
    }

    public static string GenerateSignature(IEnumerable<KeyValuePair<string, string>> fields, string passphrase)
    {
        var sb = new StringBuilder();

        foreach (var kvp in fields)
        {
            if (string.IsNullOrEmpty(kvp.Value) || string.Equals(kvp.Key, "signature", StringComparison.OrdinalIgnoreCase))
                continue;

            if (sb.Length > 0)
            {
                sb.Append('&');
            }

            var encodedVal = CustomUrlEncode(kvp.Value.Trim());
            sb.Append($"{kvp.Key.Trim()}={encodedVal}");
        }

        if (!string.IsNullOrWhiteSpace(passphrase))
        {
            sb.Append($"&passphrase={CustomUrlEncode(passphrase.Trim())}");
        }

        return ComputeMd5(sb.ToString());
    }

    private static string CustomUrlEncode(string value)
    {
        // Uri.EscapeDataString encodes spaces as %20. PayFast expects '+' for spaces and uppercase hex escapes.
        var encoded = Uri.EscapeDataString(value).Replace("%20", "+");

        var chars = encoded.ToCharArray();
        for (int i = 0; i < chars.Length - 2; i++)
        {
            if (chars[i] == '%')
            {
                chars[i + 1] = char.ToUpperInvariant(chars[i + 1]);
                chars[i + 2] = char.ToUpperInvariant(chars[i + 2]);
            }
        }
        return new string(chars);
    }

    private static string ComputeMd5(string input)
    {
        using var md5 = MD5.Create();
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = md5.ComputeHash(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
