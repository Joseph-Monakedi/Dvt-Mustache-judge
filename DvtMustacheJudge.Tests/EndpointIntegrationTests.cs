using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using DvtMustacheJudge.Api.Data;
using DvtMustacheJudge.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace DvtMustacheJudge.Tests;

public class TestGeminiJudgeService : DvtMustacheJudge.Api.Services.IGeminiJudgeService
{
    public Task<GeminiJudgeResult> JudgeMustacheAsync(
        Stream imageStream, 
        string mimeType, 
        string contestantName, 
        string? officeLocation, 
        CancellationToken cancellationToken = default)
    {
        if (contestantName.Contains("FlaggedVisionTest", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new GeminiJudgeResult
            {
                IsAppropriate = false,
                InappropriateReason = "NSFW behaviour detected in image.",
                OverallScore = 0
            });
        }

        var verdict = DvtMustacheJudge.Api.Services.GeminiJudgeService.GenerateFallbackVerdict(contestantName, officeLocation);
        return Task.FromResult(verdict);
    }
}

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = "TestMustacheDb_" + Guid.NewGuid();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            var inMemorySp = new ServiceCollection()
                .AddEntityFrameworkInMemoryDatabase()
                .BuildServiceProvider();

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase(_dbName)
                       .UseInternalServiceProvider(inMemorySp);
            });

            var geminiDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DvtMustacheJudge.Api.Services.IGeminiJudgeService));
            if (geminiDescriptor != null)
            {
                services.Remove(geminiDescriptor);
            }
            services.AddScoped<DvtMustacheJudge.Api.Services.IGeminiJudgeService, TestGeminiJudgeService>();

            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
            DbInitializer.SeedAsync(db).GetAwaiter().GetResult();
        });
    }
}

public class EndpointIntegrationTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly string _adminPassword;
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public EndpointIntegrationTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
        var config = factory.Services.GetRequiredService<IConfiguration>();
        _adminPassword = config["Admin:Password"] 
                         ?? Environment.GetEnvironmentVariable("ADMIN_PASSWORD") 
                         ?? string.Empty;
    }

    [Fact]
    public async Task GetLeaderboard_ReturnsOkAndSeededEntries()
    {
        // Act
        var response = await _client.GetAsync("/api/mustache/leaderboard?limit=50");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<LeaderboardResponseDto>(json, _jsonOptions);

        Assert.NotNull(result);
        Assert.True(result.TotalEntries >= 15, $"Expected at least 15 seeded entries, got {result.TotalEntries}");
        Assert.NotEmpty(result.Entries);

        // Verify rank ordering
        for (int i = 0; i < result.Entries.Count; i++)
        {
            Assert.Equal(i + 1, result.Entries[i].Rank);
            if (i > 0)
            {
                Assert.True(
                    result.Entries[i - 1].OverallScore >= result.Entries[i].OverallScore,
                    "Leaderboard entries should be ordered by score descending");
            }
        }
    }

    [Fact]
    public async Task GetLeaderboard_CategoryFilter_ReturnsFilteredResults()
    {
        // Act
        var response = await _client.GetAsync("/api/mustache/leaderboard?category=Chevron");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<LeaderboardResponseDto>(json, _jsonOptions);

        Assert.NotNull(result);
        Assert.NotEmpty(result.Entries);
        Assert.All(result.Entries, e => Assert.Equal("Chevron", e.StyleCategory, ignoreCase: true));
    }

    [Fact]
    public async Task GetEntryById_ExistingId_ReturnsOk()
    {
        // 1. Grab first entry from leaderboard
        var lbResponse = await _client.GetAsync("/api/mustache/leaderboard?limit=1");
        var lbJson = await lbResponse.Content.ReadAsStringAsync();
        var lbResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(lbJson, _jsonOptions);
        Assert.NotNull(lbResult);
        var firstEntry = lbResult.Entries.First();

        // 2. Fetch by ID
        var response = await _client.GetAsync($"/api/mustache/entry/{firstEntry.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var entry = JsonSerializer.Deserialize<JudgeResponseDto>(json, _jsonOptions);

        Assert.NotNull(entry);
        Assert.Equal(firstEntry.Id, entry.Id);
        Assert.Equal(firstEntry.ContestantName, entry.ContestantName);
        Assert.Equal(firstEntry.OverallScore, entry.OverallScore);
    }

    [Fact]
    public async Task GetEntryById_NonExistentId_ReturnsNotFound()
    {
        var randomId = Guid.NewGuid();
        var response = await _client.GetAsync($"/api/mustache/entry/{randomId}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task JudgeEndpoint_ValidSubmission_ReturnsVerdictAndPersists()
    {
        // Arrange
        using var formData = new MultipartFormDataContent();
        formData.Add(new StringContent("Integration Test Contestant"), "Name");
        formData.Add(new StringContent("Cape Town"), "Location");

        // Dummy 1x1 GIF / JPEG image bytes
        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "test_stache.jpg");

        // Act
        var response = await _client.PostAsync("/api/mustache/judge", formData);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var verdict = JsonSerializer.Deserialize<JudgeResponseDto>(json, _jsonOptions);

        Assert.NotNull(verdict);
        Assert.Equal("Integration Test Contestant", verdict.ContestantName);
        Assert.Equal("Cape Town", verdict.OfficeLocation);
        Assert.True(verdict.OverallScore is >= 1 and <= 100);
        Assert.True(verdict.DensityScore is >= 1 and <= 10);
        Assert.True(verdict.SymmetryScore is >= 1 and <= 10);
        Assert.True(verdict.SwaggerScore is >= 1 and <= 10);
        Assert.False(string.IsNullOrWhiteSpace(verdict.MustacheTitle));
        Assert.False(string.IsNullOrWhiteSpace(verdict.Roast));
        Assert.False(string.IsNullOrWhiteSpace(verdict.CelebrityTwin));
        Assert.False(string.IsNullOrWhiteSpace(verdict.VerdictBadge));
    }

    [Fact]
    public async Task JudgeEndpoint_MissingName_ReturnsBadRequest()
    {
        using var formData = new MultipartFormDataContent();
        formData.Add(new StringContent(""), "Name");

        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "test.jpg");

        var response = await _client.PostAsync("/api/mustache/judge", formData);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Admin_Login_ValidPassword_ReturnsOk()
    {
        var content = new StringContent(
            JsonSerializer.Serialize(new { password = _adminPassword }),
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await _client.PostAsync("/api/mustache/admin/login", content);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Admin_Login_InvalidPassword_ReturnsUnauthorized()
    {
        var content = new StringContent(
            JsonSerializer.Serialize(new { password = _adminPassword + "_invalid_nonce" }),
            System.Text.Encoding.UTF8,
            "application/json");

        var response = await _client.PostAsync("/api/mustache/admin/login", content);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Admin_Entries_ValidPassword_ReturnsOverview()
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/mustache/admin/entries");
        req.Headers.Add("X-Admin-Password", _adminPassword);

        var response = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var overview = JsonSerializer.Deserialize<AdminOverviewDto>(json, _jsonOptions);

        Assert.NotNull(overview);
        Assert.True(overview.TotalSubmissions >= 15);
        Assert.NotEmpty(overview.Entries);
    }

    [Fact]
    public async Task Admin_Entries_InvalidPassword_ReturnsUnauthorized()
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, "/api/mustache/admin/entries");
        req.Headers.Add("X-Admin-Password", "invalid-token");

        var response = await _client.SendAsync(req);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Admin_ToggleHide_TogglesVisibility()
    {
        // 1. Get first entry
        using var getReq = new HttpRequestMessage(HttpMethod.Get, "/api/mustache/admin/entries");
        getReq.Headers.Add("X-Admin-Password", _adminPassword);
        var getRes = await _client.SendAsync(getReq);
        var getJson = await getRes.Content.ReadAsStringAsync();
        var overview = JsonSerializer.Deserialize<AdminOverviewDto>(getJson, _jsonOptions);
        Assert.NotNull(overview);
        var targetEntry = overview.Entries.First();

        // 2. Toggle hide
        using var toggleReq = new HttpRequestMessage(HttpMethod.Post, $"/api/mustache/admin/entry/{targetEntry.Id}/toggle-hide");
        toggleReq.Headers.Add("X-Admin-Password", _adminPassword);
        var toggleRes = await _client.SendAsync(toggleReq);
        Assert.Equal(HttpStatusCode.OK, toggleRes.StatusCode);

        // 3. Re-toggle back
        using var revertReq = new HttpRequestMessage(HttpMethod.Post, $"/api/mustache/admin/entry/{targetEntry.Id}/toggle-hide");
        revertReq.Headers.Add("X-Admin-Password", _adminPassword);
        var revertRes = await _client.SendAsync(revertReq);
        Assert.Equal(HttpStatusCode.OK, revertRes.StatusCode);
    }

    [Fact]
    public async Task JudgeEndpoint_VulgarName_ReturnsBadRequestAndDoesNotPersist()
    {
        // Arrange: Count before submission
        var initialLb = await _client.GetAsync("/api/mustache/leaderboard?limit=100");
        var initialJson = await initialLb.Content.ReadAsStringAsync();
        var initialResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(initialJson, _jsonOptions);
        var initialCount = initialResult?.TotalEntries ?? 0;

        using var formData = new MultipartFormDataContent();
        formData.Add(new StringContent("John Motherfucker Doe"), "Name");
        formData.Add(new StringContent("Johannesburg"), "Location");

        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "test_stache.jpg");

        // Act
        var response = await _client.PostAsync("/api/mustache/judge", formData);

        // Assert: 400 Bad Request
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("Submission rejected", json);
        Assert.Contains("inappropriate or vulgar", json);

        // Verify entry was NOT persisted in leaderboard / database
        var afterLb = await _client.GetAsync("/api/mustache/leaderboard?limit=100");
        var afterJson = await afterLb.Content.ReadAsStringAsync();
        var afterResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(afterJson, _jsonOptions);

        Assert.Equal(initialCount, afterResult?.TotalEntries ?? 0);
        Assert.DoesNotContain(afterResult?.Entries ?? new List<LeaderboardEntryDto>(), e => e.ContestantName.Contains("Motherfucker"));
    }

    [Fact]
    public async Task JudgeEndpoint_NSFWImage_ReturnsBadRequestAndDoesNotPersist()
    {
        // Arrange: Count before submission
        var initialLb = await _client.GetAsync("/api/mustache/leaderboard?limit=100");
        var initialJson = await initialLb.Content.ReadAsStringAsync();
        var initialResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(initialJson, _jsonOptions);
        var initialCount = initialResult?.TotalEntries ?? 0;

        using var formData = new MultipartFormDataContent();
        // Triggers the TestGeminiJudgeService NSFW simulation
        formData.Add(new StringContent("Alex Clean Guy FlaggedVisionTest"), "Name");
        formData.Add(new StringContent("Cape Town"), "Location");

        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "test_nsfw.jpg");

        // Act
        var response = await _client.PostAsync("/api/mustache/judge", formData);

        // Assert: 400 Bad Request
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("Submission rejected", json);
        Assert.Contains("Inappropriate or NSFW", json);

        // Verify entry was NOT persisted in leaderboard / database
        var afterLb = await _client.GetAsync("/api/mustache/leaderboard?limit=100");
        var afterJson = await afterLb.Content.ReadAsStringAsync();
        var afterResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(afterJson, _jsonOptions);

        Assert.Equal(initialCount, afterResult?.TotalEntries ?? 0);
        Assert.DoesNotContain(afterResult?.Entries ?? new List<LeaderboardEntryDto>(), e => e.ContestantName.Contains("FlaggedVisionTest"));
    }
}
