using System.Linq;
using DvtMustacheJudge.Api.Services;
using Xunit;

namespace DvtMustacheJudge.Tests;

public class PromptSafetyTests
{
    private static readonly string[] ForbiddenSafetyKeywords = new[]
    {
        "skin color", "skin tone", "complexion", "ethnicity", "race", "racial",
        "weight", "obese", "skinny", "fat", "teeth", "wrinkles",
        "ugly", "deformed", "gender", "sexist"
    };

    private static readonly string[] RequiredFollicleFocusKeywords = new[]
    {
        "mustache", "bristle", "follicle", "upper lip", "symmetry", "density",
        "swagger", "grooming", "stache", "curvature", "style"
    };

    [Fact]
    public void FallbackVerdicts_StrictlyRespectKindnessAndSafetyInvariant()
    {
        // Execute 50 sample fallback verdicts to thoroughly test randomness
        for (int i = 0; i < 50; i++)
        {
            var verdict = GeminiJudgeService.GenerateFallbackVerdict("Test Contestant", "Johannesburg");

            Assert.True(verdict.OverallScore is >= 1 and <= 100);
            Assert.True(verdict.DensityScore is >= 1 and <= 10);
            Assert.True(verdict.SymmetryScore is >= 1 and <= 10);
            Assert.True(verdict.SwaggerScore is >= 1 and <= 10);

            var roast = verdict.Roast.ToLowerInvariant();
            var twin = verdict.CelebrityTwin.ToLowerInvariant();
            var title = verdict.MustacheTitle.ToLowerInvariant();

            // 1. Ensure zero forbidden safety keywords leak
            foreach (var forbidden in ForbiddenSafetyKeywords)
            {
                Assert.DoesNotContain(forbidden, roast);
                Assert.DoesNotContain(forbidden, twin);
                Assert.DoesNotContain(forbidden, title);
            }

            // 2. Ensure roast remains focused on facial hair / bristles / swagger
            var containsFollicleFocus = RequiredFollicleFocusKeywords.Any(k => roast.Contains(k));
            Assert.True(
                containsFollicleFocus,
                $"Roast '{verdict.Roast}' should explicitly reference facial hair or bristle qualities.");
        }
    }

    [Fact]
    public void AllowedCategories_ConformToContractSpecification()
    {
        var allowedCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Chevron", "Handlebar", "Pencil", "Horseshoe", "Walrus",
            "Peach Fuzz", "Stubbled Maverick", "Painter's Brush", "Other"
        };

        for (int i = 0; i < 30; i++)
        {
            var verdict = GeminiJudgeService.GenerateFallbackVerdict($"Contestant #{i}", "Cape Town");
            Assert.Contains(verdict.StyleCategory, allowedCategories);
        }
    }
}
