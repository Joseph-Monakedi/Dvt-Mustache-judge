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

    [Fact]
    public async Task RateLimiter_AcquireAsync_QueuesAndDequeuesWhenWindowOpens()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Gemini:MaxRequestsPerMinute", "2" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        // 350ms sliding window for fast, reliable unit testing
        var window = TimeSpan.FromMilliseconds(350);
        var rateLimiter = new GeminiRateLimiter(configuration, NullLogger<GeminiRateLimiter>.Instance, window);

        // 1. First 2 requests acquire immediately
        var task1 = rateLimiter.AcquireAsync();
        var task2 = rateLimiter.AcquireAsync();

        Assert.True(task1.IsCompletedSuccessfully, "Request 1 should complete immediately");
        Assert.True(task2.IsCompletedSuccessfully, "Request 2 should complete immediately");
        Assert.Equal(0, rateLimiter.GetRemainingRequests());
        Assert.Equal(0, rateLimiter.QueuedRequestsCount);

        // 2. 3rd request arrives while window is full: must be queued
        var task3 = rateLimiter.AcquireAsync();

        Assert.False(task3.IsCompleted, "Request 3 should NOT complete immediately while quota is full");
        Assert.Equal(1, rateLimiter.QueuedRequestsCount);

        // 3. Await task3: as the window opens after 350ms, task3 must dequeue and complete
        await task3;

        Assert.True(task3.IsCompletedSuccessfully, "Request 3 should dequeue and complete once the window opens");
        Assert.Equal(0, rateLimiter.QueuedRequestsCount);
    }

    [Fact]
    public async Task RateLimiter_AcquireAsync_Cancellation_CleansUpQueueWithoutBlocking()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Gemini:MaxRequestsPerMinute", "1" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var window = TimeSpan.FromMilliseconds(500);
        var rateLimiter = new GeminiRateLimiter(configuration, NullLogger<GeminiRateLimiter>.Instance, window);

        // Fill slot
        await rateLimiter.AcquireAsync();

        // Enqueue with cancellation token
        using var cts = new CancellationTokenSource();
        var taskQueued = rateLimiter.AcquireAsync(cts.Token);

        Assert.False(taskQueued.IsCompleted);

        // Cancel
        cts.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () => await taskQueued);

        // Wait for window to reset and ensure subsequent request can acquire cleanly
        await Task.Delay(550);
        var subsequentTask = rateLimiter.AcquireAsync();
        Assert.True(subsequentTask.IsCompletedSuccessfully, "Subsequent request should acquire immediately after window resets");
    }
}
