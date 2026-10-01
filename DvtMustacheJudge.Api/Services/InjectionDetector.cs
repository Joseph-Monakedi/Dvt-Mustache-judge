using System.Text.RegularExpressions;
using DvtMustacheJudge.Api.Models;

namespace DvtMustacheJudge.Api.Services;

public static class InjectionDetector
{
    private static readonly string[] SqlInjectionKeywords = new[]
    {
        "drop table", "alter table", "truncate table", "delete from",
        "insert into", "union select", "union all select",
        "select *", "select null", "select 1", "exec(", "execute(",
        "xp_cmdshell", "waitfor delay", "benchmark(", "sleep(",
        "pg_sleep", "information_schema", "sysobjects", "syscolumns",
        "or 1=1", "or '1'='1'", "or \"1\"=\"1\"", "and 1=1", "having 1=1",
        ";--", "/*", "*/", "bobby tables"
    };

    private static readonly string[] PromptInjectionPhrases = new[]
    {
        "ignore previous", "ignore all", "ignore criteria", "ignore instructions",
        "ignore rules", "disregard previous", "disregard all", "disregard instructions",
        "forget previous", "forget all", "forget everything", "drop all instructions",
        "drop instructions", "override instructions", "override prompt",
        "system prompt", "system instruction", "system override", "developer message",
        "developer instruction", "you are now", "act as", "jailbreak", "dan mode",
        "give max score", "give 100", "give perfect", "award 100", "grant 100",
        "grant max", "score: 100", "score:100", "score 100", "bypass instructions",
        "bypass safety", "prompt injection", "sql injection"
    };

    /// <summary>
    /// Checks whether the text contains an obvious prompt injection or SQL injection attempt.
    /// </summary>
    public static bool IsInjectionAttempt(string? text, out string? matchedPattern)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            matchedPattern = null;
            return false;
        }

        var normalized = text.Trim().ToLowerInvariant();

        // 1. Direct prompt injection phrases
        foreach (var phrase in PromptInjectionPhrases)
        {
            if (normalized.Contains(phrase))
            {
                matchedPattern = phrase;
                return true;
            }
        }

        // 2. Regex for prompt injection variations
        if (Regex.IsMatch(normalized, @"\bignore\s+(all|prior|previous|criteria|the|any)\b", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(normalized, @"\bdrop\s+(all|the|prior|previous)\s+(instructions|rules|criteria)\b", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(normalized, @"\b(give|award|grant)\s+(me\s+)?(a\s+)?(max|perfect|100)\b", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(normalized, @"\b(system|developer)\s+(prompt|instruction|override)\b", RegexOptions.IgnoreCase))
        {
            matchedPattern = "Prompt Injection Pattern";
            return true;
        }

        // 3. Direct SQL keywords
        foreach (var keyword in SqlInjectionKeywords)
        {
            if (normalized.Contains(keyword))
            {
                matchedPattern = keyword;
                return true;
            }
        }

        // 4. Regex for SQL injection syntax
        if (Regex.IsMatch(normalized, @"('|\"")\s*(or|and)\s*('|\"")?\d+('|\"")?\s*=\s*('|\"")?\d+", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(normalized, @"('|\"")\s*(or|and)\s*('|\"")?[a-z]('|\"")?\s*=\s*('|\"")?[a-z]", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(normalized, @"(--|#|/\*).*(select|drop|insert|delete|update)", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(normalized, @";\s*(drop|delete|update|insert|alter|truncate)\b", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(normalized, @"\bunion\s+(all\s+)?select\b", RegexOptions.IgnoreCase))
        {
            matchedPattern = "SQL Injection Pattern";
            return true;
        }

        matchedPattern = null;
        return false;
    }

    /// <summary>
    /// Applies the unhackable Wooden Spoon verdict to a GeminiJudgeResult.
    /// Preserves the AI-generated roast so there are no hardcoded roasts.
    /// </summary>
    public static void ApplyWoodenSpoonInjectionVerdict(GeminiJudgeResult result)
    {
        result.IsWoodenSpoon = true;
        result.WoodenSpoonReason = "Prompt / SQL Injection";
        result.InnovationScore = Math.Clamp(result.InnovationScore > 0 ? result.InnovationScore : 9, 1, 10);
        result.DedicationScore = Math.Clamp(result.DedicationScore > 0 ? result.DedicationScore : 8, 1, 10);
        result.FunninessScore = Math.Clamp(result.FunninessScore > 0 ? result.FunninessScore : 10, 1, 10);
        result.OverallScore = (result.InnovationScore * 3) + (result.DedicationScore * 3) + (result.FunninessScore * 4);

        if (string.IsNullOrWhiteSpace(result.MustacheTitle) || result.MustacheTitle == "Follicle 404: Not Found")
        {
            result.MustacheTitle = "The Bobby Tables Exploit";
        }
        if (string.IsNullOrWhiteSpace(result.StyleCategory) || result.StyleCategory == "Other")
        {
            result.StyleCategory = "SQL/Prompt Injection";
        }
        if (string.IsNullOrWhiteSpace(result.VerdictBadge) || result.VerdictBadge == "Zero-Bristle Deficit")
        {
            result.VerdictBadge = "Jailbreak Defeated";
        }
        if (string.IsNullOrWhiteSpace(result.CelebrityTwin))
        {
            result.CelebrityTwin = "90% Little Bobby Tables, 10% Cyber Infiltrator";
        }
        // Do NOT set or overwrite result.Roast here — let the AI come up with the roast!
    }

    /// <summary>
    /// Applies the unhackable Wooden Spoon verdict to an existing MustacheEntry.
    /// Preserves the existing/AI roast so there are no hardcoded roasts.
    /// </summary>
    public static void ApplyWoodenSpoonInjectionVerdict(MustacheEntry entry)
    {
        entry.IsWoodenSpoon = true;
        entry.WoodenSpoonReason = "Prompt / SQL Injection";
        if (entry.InnovationScore == 0) entry.InnovationScore = 9;
        if (entry.DedicationScore == 0) entry.DedicationScore = 8;
        if (entry.FunninessScore == 0) entry.FunninessScore = 10;
        entry.OverallScore = (entry.InnovationScore * 3) + (entry.DedicationScore * 3) + (entry.FunninessScore * 4);

        if (string.IsNullOrWhiteSpace(entry.MustacheTitle) || entry.MustacheTitle == "Follicle 404: Not Found")
        {
            entry.MustacheTitle = "The Bobby Tables Exploit";
        }
        if (string.IsNullOrWhiteSpace(entry.StyleCategory) || entry.StyleCategory == "Other")
        {
            entry.StyleCategory = "SQL/Prompt Injection";
        }
        if (string.IsNullOrWhiteSpace(entry.VerdictBadge) || entry.VerdictBadge == "Zero-Bristle Deficit")
        {
            entry.VerdictBadge = "Jailbreak Defeated";
        }
        if (string.IsNullOrWhiteSpace(entry.CelebrityTwin))
        {
            entry.CelebrityTwin = "90% Little Bobby Tables, 10% Cyber Infiltrator";
        }
        // Do NOT overwrite entry.RoastCommentary here — let the AI come up with the roast!
    }
}
