using System.Text.RegularExpressions;

namespace DvtMustacheJudge.Api.Services;

public class ContentModerationService : IContentModerationService
{
    private readonly ILogger<ContentModerationService> _logger;

    // Direct vulgar / NSFW / offensive root words
    private static readonly HashSet<string> ExactBlockedWords = new(StringComparer.OrdinalIgnoreCase)
    {
        // Profanities
        "fuck", "fucker", "fucking", "fucked", "fuckface", "fuckhead", "fck", "fuk",
        "shit", "bullshit", "shitty", "shat", "dipshit", "shithead",
        "bitch", "bitches", "bitchy",
        "cunt", "cunts",
        "asshole", "arsehole", "bastard", "bastards", "wanker", "wankers",
        "twat", "twats", "prick", "pricks", "dickhead", "dickheads",
        "motherfucker", "motherfucking",

        // NSFW / Explicit sexual terms
        "porn", "porno", "pornography", "hentai", "xxx", "nsfw",
        "penis", "vagina", "dildo", "vibrator", "orgasm", "ejaculation",
        "blowjob", "handjob", "cum", "cumming", "cumshot", "creampie", "deepthroat",
        "clitoris", "fellatio", "cunnilingus", "anus",
        "nude", "nudes", "naked", "nudity", "erotic", "boobs", "tits", "titties",
        "whore", "whores", "slut", "sluts", "hooker", "prostitute",
        "milf", "dilf",

        // Hate speech & severe slurs
        "nigger", "nigga", "faggot", "fag", "retard", "retarded", "chink", "kike", "spic"
    };

    // Substring patterns for unmistakable vulgarities (regardless of word boundary)
    private static readonly string[] UnmistakableSubstrings = new[]
    {
        "fuck", "fck", "fuk", "cunt", "motherfuck", "asshole", "arsehole",
        "blowjob", "handjob", "deepthroat", "cumshot", "creampie", "dildo",
        "nigger", "faggot"
    };

    public ContentModerationService(ILogger<ContentModerationService> logger)
    {
        _logger = logger;
    }

    public ModerationResult CheckName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return new ModerationResult(false, "Name cannot be empty.");
        }

        var trimmed = name.Trim();

        // 1. Direct word check on raw input
        var rawTokens = Regex.Split(trimmed, @"[\s\-_.,!@#$%^&*()+=\[\]{};:'""\\/<>?|`~]+", RegexOptions.Compiled);
        foreach (var token in rawTokens)
        {
            if (ExactBlockedWords.Contains(token))
            {
                _logger.LogWarning("Vulgar name rejected by exact word match: '{Token}' in '{Name}'", token, trimmed);
                return new ModerationResult(false, "Contestant name contains inappropriate or vulgar language.");
            }
        }

        // 2. Normalized check with leetspeak translation
        var normalized = NormalizeLeetspeak(trimmed);

        // Check tokens of normalized name
        var normalizedTokens = Regex.Split(normalized, @"[\s\-_.,!@#$%^&*()+=\[\]{};:'""\\/<>?|`~]+", RegexOptions.Compiled);
        foreach (var token in normalizedTokens)
        {
            if (ExactBlockedWords.Contains(token))
            {
                _logger.LogWarning("Vulgar name rejected by normalized token match: '{Token}' in '{Name}'", token, trimmed);
                return new ModerationResult(false, "Contestant name contains inappropriate or vulgar language.");
            }
        }

        // 3. Compacted check (spaces & punctuation removed, collapsed repeated characters)
        // e.g. "f.u.c.k", "f u c k", "fuuuuck", "s h i t"
        var compacted = Regex.Replace(normalized, @"[^a-z0-9]", "", RegexOptions.Compiled | RegexOptions.IgnoreCase);
        // Collapse 3 or more repeated letters to 1 (e.g. fuuuck -> fuck)
        compacted = Regex.Replace(compacted, @"(.)\1{2,}", "$1", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        foreach (var sub in UnmistakableSubstrings)
        {
            if (compacted.Contains(sub, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Vulgar name rejected by compacted substring match: '{Sub}' in '{Name}' (compacted: '{Compacted}')", sub, trimmed, compacted);
                return new ModerationResult(false, "Contestant name contains inappropriate or vulgar language.");
            }
        }

        return new ModerationResult(true, null);
    }

    private static string NormalizeLeetspeak(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;

        var lower = input.ToLowerInvariant();
        var chars = new char[lower.Length];

        for (int i = 0; i < lower.Length; i++)
        {
            chars[i] = lower[i] switch
            {
                '@' or '4' => 'a',
                '$' or '5' => 's',
                '0' => 'o',
                '1' or '!' or '|' => 'i',
                '3' => 'e',
                '7' or '+' => 't',
                '8' => 'b',
                _ => lower[i]
            };
        }

        return new string(chars);
    }
}
