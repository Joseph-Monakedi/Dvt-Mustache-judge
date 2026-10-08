using DvtMustacheJudge.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DvtMustacheJudge.Tests;

public class RateLimiterTests
{
    [Fact]
    public void RateLimiter_PermitsExactlyThreeRequestsPerMinute()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Gemini:MaxRequestsPerMinute", "3" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var rateLimiter = new GeminiRateLimiter(configuration, NullLogger<GeminiRateLimiter>.Instance);

        // Requests 1, 2, 3 should succeed
        Assert.True(rateLimiter.TryAcquire(), "Request 1 should be allowed");
        Assert.True(rateLimiter.TryAcquire(), "Request 2 should be allowed");
        Assert.True(rateLimiter.TryAcquire(), "Request 3 should be allowed");

        // 4th request must be denied by rate limiter
        Assert.False(rateLimiter.TryAcquire(), "Request 4 should be throttled/denied within the 60s window");
        Assert.Equal(0, rateLimiter.GetRemainingRequests());
    }
}
