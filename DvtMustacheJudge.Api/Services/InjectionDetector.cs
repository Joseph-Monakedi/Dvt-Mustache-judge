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
        "drop instructions", "override instructions", "override prompt", "override score",
        "system prompt", "system instruction", "system override", "developer message",
        "developer instruction", "you are now", "act as", "jailbreak", "dan mode",
        "give max score", "give 100", "give perfect", "award 100", "grant 100",
        "grant max", "score: 100", "score:100", "score 100", "bypass instructions",
        "bypass safety", "prompt injection", "sql injection", "<script"
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
            Regex.IsMatch(normalized, @"\boverride\s+.*score\b", RegexOptions.IgnoreCase) ||
            Regex.IsMatch(normalized, @"\b(system|developer)\s*:\s*", RegexOptions.IgnoreCase) ||
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
    /// Rejects a prompt injection or SQL injection attempt in the Main Movember Mustache Challenge.
    /// </summary>
    public static void RejectMainChallengeInjection(GeminiJudgeResult result)
    {
        result.IsAppropriate = false;
        result.InappropriateReason = "Prompt injection attempt detected: Instruction override or prompt injection attempt rejected.";
        result.OverallScore = 0;
        result.DensityScore = 0;
        result.SymmetryScore = 0;
        result.SwaggerScore = 0;
        result.InnovationScore = 0;
        result.DedicationScore = 0;
        result.FunninessScore = 0;
        result.IsWoodenSpoon = false;
        result.WoodenSpoonReason = null;
        result.MustacheTitle = "Rejected";
        result.StyleCategory = "Other";
        result.VerdictBadge = "Prompt Injection Rejected";
        result.CelebrityTwin = "None";
        result.Roast = "Submission rejected: Prompt and instruction injection attempts are strictly prohibited in the Movember Mustache Challenge.";
    }

    /// <summary>
    /// Scores a creative hack or injection concept in the Creative Mustache Challenge.
    /// </summary>
    public static void ApplyCreativeChallengeInjection(GeminiJudgeResult result)
    {
        result.IsAppropriate = true;
        result.InappropriateReason = null;
        result.IsWoodenSpoon = false;
        result.WoodenSpoonReason = null;
        result.DensityScore = Math.Clamp(result.DensityScore > 0 ? result.DensityScore : 7, 1, 10);
        result.SymmetryScore = Math.Clamp(result.SymmetryScore > 0 ? result.SymmetryScore : 8, 1, 10);
        result.SwaggerScore = Math.Clamp(result.SwaggerScore > 0 ? result.SwaggerScore : 9, 1, 10);
        result.InnovationScore = 9;
        result.DedicationScore = 8;
        result.FunninessScore = 9;
        result.OverallScore = (int)Math.Round((result.DensityScore * 3.5) + (result.SymmetryScore * 3.5) + (result.SwaggerScore * 3.0));

        result.MustacheTitle = "The Bobby Tables Exploit";
        result.StyleCategory = "Household Avant-Garde";
        result.VerdictBadge = "Creative Code Maestro";
        result.CelebrityTwin = "80% Little Bobby Tables, 20% Creative Hacker";
        result.Roast = "Audacious cyber craft attempt detected! While parameterized queries held the line, your comedic ingenuity earns legitimate honors in the Creative Mustache Challenge.";
    }

    /// <summary>
    /// Scores a creative hack or injection concept on a MustacheEntry for the Creative Mustache Challenge.
    /// </summary>
    public static void ApplyCreativeChallengeInjection(MustacheEntry entry)
    {
        entry.CompetitionType = "CreativeMustache";
        entry.IsWoodenSpoon = false;
        entry.WoodenSpoonReason = null;
        if (entry.DensityScore == 0) entry.DensityScore = 7;
        if (entry.SymmetryScore == 0) entry.SymmetryScore = 8;
        if (entry.SwaggerScore == 0) entry.SwaggerScore = 9;
        entry.InnovationScore = 9;
        entry.DedicationScore = 8;
        entry.FunninessScore = 9;
        entry.OverallScore = (int)Math.Round((entry.DensityScore * 3.5) + (entry.SymmetryScore * 3.5) + (entry.SwaggerScore * 3.0));

        entry.MustacheTitle = "The Bobby Tables Exploit";
        entry.StyleCategory = "Household Avant-Garde";
        entry.VerdictBadge = "Creative Code Maestro";
        entry.CelebrityTwin = "80% Little Bobby Tables, 20% Creative Hacker";
    }
}
