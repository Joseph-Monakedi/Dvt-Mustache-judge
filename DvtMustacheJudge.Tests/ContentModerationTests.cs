using DvtMustacheJudge.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DvtMustacheJudge.Tests;

public class ContentModerationTests
{
    private readonly ContentModerationService _service = new(NullLogger<ContentModerationService>.Instance);

    [Theory]
    [InlineData("John Doe")]
    [InlineData("Pieter van der Merwe")]
    [InlineData("François Du Plessis")]
    [InlineData("Kabelo Mokoena")]
    [InlineData("Chen Wei")]
    [InlineData("Sarah O'Connor")]
    [InlineData("Cassandra")]
    [InlineData("Dickson")]
    [InlineData("Bass")]
    [InlineData("Titus")]
    [InlineData("Sir Reginald Whisker")]
    public void CheckName_ValidAppropriateNames_ReturnsTrue(string name)
    {
        var result = _service.CheckName(name);
        Assert.True(result.IsAppropriate, $"Expected clean name '{name}' to be approved, but was rejected: {result.Reason}");
        Assert.Null(result.Reason);
    }

    [Theory]
    [InlineData("fuck")]
    [InlineData("FUCK")]
    [InlineData("bitch")]
    [InlineData("cunt")]
    [InlineData("motherfucker")]
    [InlineData("asshole")]
    [InlineData("wanker")]
    [InlineData("twat")]
    [InlineData("dickhead")]
    [InlineData("porn")]
    [InlineData("nsfw")]
    [InlineData("blowjob")]
    [InlineData("dildo")]
    [InlineData("nude")]
    public void CheckName_DirectVulgarAndNSFWNames_ReturnsFalse(string name)
    {
        var result = _service.CheckName(name);
        Assert.False(result.IsAppropriate, $"Expected vulgar name '{name}' to be rejected.");
        Assert.NotNull(result.Reason);
    }

    [Theory]
    [InlineData("f u c k")]
    [InlineData("f.u.c.k")]
    [InlineData("f-u-c-k")]
    [InlineData("fuuuuck")]
    [InlineData("b!tch")]
    [InlineData("b1tch")]
    [InlineData("p0rn")]
    [InlineData("a$$hole")]
    [InlineData("c u n t")]
    [InlineData("m0therfucker")]
    public void CheckName_LeetspeakAndEvasionAttempts_ReturnsFalse(string name)
    {
        var result = _service.CheckName(name);
        Assert.False(result.IsAppropriate, $"Expected obfuscated name '{name}' to be rejected.");
        Assert.NotNull(result.Reason);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void CheckName_EmptyOrWhitespace_ReturnsFalse(string name)
    {
        var result = _service.CheckName(name);
        Assert.False(result.IsAppropriate);
        Assert.NotNull(result.Reason);
    }
}
