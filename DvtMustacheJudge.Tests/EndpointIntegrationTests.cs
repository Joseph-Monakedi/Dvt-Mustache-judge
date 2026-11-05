using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DvtMustacheJudge.Api.Data;
using DvtMustacheJudge.Api.Models;
using DvtMustacheJudge.Api.Controllers;
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
        Stream? cleanShaveStream = null,
        string? cleanShaveMimeType = null,
        string competitionType = "Mustache",
        CancellationToken cancellationToken = default)
    {
        if (contestantName.Contains("FlaggedVisionTest", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new GeminiJudgeResult
            {
                IsAppropriate = false,
                InappropriateReason = "Inappropriate or NSFW behaviour detected in image.",
                OverallScore = 0
            });
        }

        if (contestantName.Contains("IdentityMismatchTest", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new GeminiJudgeResult
            {
                IsAppropriate = false,
                IsSamePerson = false,
                IdentityMatchReason = "Facial biometrics do not match the registered baseline photo.",
                InappropriateReason = "Identity Mismatch: The person in this mustache submission does not match the person in the Day 1 clean shave baseline photo.",
                OverallScore = 0,
                MustacheTitle = "Rejected: Identity Mismatch",
                VerdictBadge = "Identity Mismatch"
            });
        }

        bool hasBaseline = cleanShaveStream != null;
        var verdict = DvtMustacheJudge.Api.Services.GeminiJudgeService.GenerateFallbackVerdict(contestantName, hasBaseline);
        return Task.FromResult(verdict);
    }

    public Task<CleanShaveVerificationResult> VerifyCleanShaveAsync(
        Stream imageStream,
        string mimeType,
        string contestantName,
        CancellationToken cancellationToken = default)
    {
        if (contestantName.Contains("NotShavenTest", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new CleanShaveVerificationResult
            {
                IsCleanShaven = false,
                HasFace = true,
                Feedback = "Baseline rejected! An existing mustache was detected. You must be clean-shaven to establish your Day 1 baseline."
            });
        }

        if (contestantName.Contains("NoFaceTest", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new CleanShaveVerificationResult
            {
                IsCleanShaven = false,
                HasFace = false,
                Feedback = "No human face detected! Please snap a clear selfie centering your face."
            });
        }

        if (contestantName.Contains("FlaggedVisionTest", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new CleanShaveVerificationResult
            {
                IsAppropriate = false,
                IsCleanShaven = false,
                InappropriateReason = "Inappropriate content detected in clean shave photo.",
                Feedback = "Photo rejected due to content policy violation."
            });
        }

        return Task.FromResult(new CleanShaveVerificationResult
        {
            IsCleanShaven = true,
            HasFace = true,
            IsAppropriate = true,
            Feedback = "Day 1 clean shave confirmed! Bare follicles detected across the upper lip."
        });
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

            if (!db.MustacheEntries.Any())
            {
                for (int i = 1; i <= 16; i++)
                {
                    db.MustacheEntries.Add(new MustacheEntry
                    {
                        Id = Guid.NewGuid(),
                        ContestantName = $"Test Contestant {i}",
                        StyleCategory = "The Upper-Lip",
                        MustacheTitle = $"The Champion {i}",
                        RoastCommentary = "Spectacular grooming.",
                        CelebrityTwin = "Tom Selleck",
                        VerdictBadge = "Certified Mo Bro",
                        DensityScore = 8,
                        SymmetryScore = 8,
                        SwaggerScore = 8,
                        OverallScore = Math.Clamp(85 - i, 1, 100),
                        ImageUrl = "https://example.com/img.jpg",
                        CreatedAt = DateTime.UtcNow.AddMinutes(-i),
                        IsHidden = false,
                        IsWoodenSpoon = false,
                        CompetitionType = i > 14 ? "CreativeMustache" : "Mustache"
                    });
                }
                db.SaveChanges();
            }
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
        MustacheController.InvalidateLeaderboardCache();
        _client = factory.CreateClient();
        var config = factory.Services.GetRequiredService<IConfiguration>();
        _adminPassword = config["Admin:Password"] 
                         ?? Environment.GetEnvironmentVariable("ADMIN_PASSWORD") 
                         ?? string.Empty;
    }

    private async Task<(string Token, Guid UserId)> CreatePaidContestantWithCleanShaveAsync(string name)
    {
        var email = $"contestant_{Guid.NewGuid():N}@example.com";
        var reg = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, name, "password123"));
        var regDoc = JsonDocument.Parse(await reg.Content.ReadAsStringAsync());
        var token = regDoc.RootElement.GetProperty("token").GetString()!;
        var userId = regDoc.RootElement.GetProperty("id").GetGuid();

        // Admin approves R100 leaderboard fee
        var adminToggle = new HttpRequestMessage(HttpMethod.Post, $"/api/mustache/admin/contestant/{userId}/toggle-leaderboard-paid");
        adminToggle.Headers.Add("X-Admin-Password", _adminPassword);
        await _client.SendAsync(adminToggle);

        // Upload Day 1 Clean Shave
        using var csFormData = new MultipartFormDataContent();
        var dummyCsBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var csImageContent = new ByteArrayContent(dummyCsBytes);
        csImageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        csFormData.Add(csImageContent, "image", "baseline.jpg");

        var uploadReq = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/clean-shave") { Content = csFormData };
        uploadReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        await _client.SendAsync(uploadReq);

        return (token, userId);
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
        var response = await _client.GetAsync("/api/mustache/leaderboard?category=The%20Upper-Lip");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<LeaderboardResponseDto>(json, _jsonOptions);

        Assert.NotNull(result);
        Assert.NotEmpty(result.Entries);
        Assert.All(result.Entries, e => Assert.Equal("The Upper-Lip", e.StyleCategory, ignoreCase: true));
    }

    [Fact]
    public async Task GetEntryById_ExistingId_ReturnsOk()
    {
        MustacheController.InvalidateLeaderboardCache();
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
        var (token, _) = await CreatePaidContestantWithCleanShaveAsync("Integration Test Contestant");

        using var formData = new MultipartFormDataContent();
        formData.Add(new StringContent("Integration Test Contestant"), "Name");

        // Dummy 1x1 GIF / JPEG image bytes
        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "test_stache.jpg");

        // Act
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/judge") { Content = formData };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(req);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var verdict = JsonSerializer.Deserialize<JudgeResponseDto>(json, _jsonOptions);

        Assert.NotNull(verdict);
        Assert.Equal("Integration Test Contestant", verdict.ContestantName);
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
        var (token, _) = await CreatePaidContestantWithCleanShaveAsync("Valid Contestant");

        using var formData = new MultipartFormDataContent();
        formData.Add(new StringContent(""), "Name");

        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "test.jpg");

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/judge") { Content = formData };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(req);
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

        var (token, _) = await CreatePaidContestantWithCleanShaveAsync("Paid Contestant");

        using var formData = new MultipartFormDataContent();
        formData.Add(new StringContent("John Motherfucker Doe"), "Name");

        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "test_stache.jpg");

        // Act
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/judge") { Content = formData };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(req);

        // Assert: 400 Bad Request
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("Submission rejected", json);
        Assert.Contains("inappropriate or vulgar", json);

        // Verify entry was NOT persisted in leaderboard / database
        var afterLb = await _client.GetAsync("/api/mustache/leaderboard?limit=100");
        var afterJson = await afterLb.Content.ReadAsStringAsync();
        var afterResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(afterJson, _jsonOptions);

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

        var (token, _) = await CreatePaidContestantWithCleanShaveAsync("Flagged Contestant");

        using var formData = new MultipartFormDataContent();
        // Triggers the TestGeminiJudgeService NSFW simulation
        formData.Add(new StringContent("Alex Clean Guy FlaggedVisionTest"), "Name");

        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "test_nsfw.jpg");

        // Act
        var req = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/judge") { Content = formData };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(req);

        // Assert: 400 Bad Request
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("Submission rejected", json);
        Assert.Contains("Inappropriate or NSFW", json);

        // Verify entry was NOT persisted in leaderboard / database
        var afterLb = await _client.GetAsync("/api/mustache/leaderboard?limit=100");
        var afterJson = await afterLb.Content.ReadAsStringAsync();
        var afterResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(afterJson, _jsonOptions);

        Assert.DoesNotContain(afterResult?.Entries ?? new List<LeaderboardEntryDto>(), e => e.ContestantName.Contains("FlaggedVisionTest"));
    }

    [Fact]
    public async Task GetLeaderboard_CreativeDivision_SeparatesCreativeAndMustacheEntriesProperly()
    {
        // 1. Query mustache and creative leaderboards
        var mustacheLb = await _client.GetAsync("/api/mustache/leaderboard?division=mustache");
        Assert.Equal(HttpStatusCode.OK, mustacheLb.StatusCode);
        var mustacheResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(await mustacheLb.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(mustacheResult);

        var creativeLb = await _client.GetAsync("/api/mustache/leaderboard?division=creative");
        Assert.Equal(HttpStatusCode.OK, creativeLb.StatusCode);
        var creativeResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(await creativeLb.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(creativeResult);

        // Verify none of the mustache entries are tagged creative
        foreach (var entry in mustacheResult.Entries)
        {
            Assert.False(entry.IsWoodenSpoon);
            Assert.NotEqual("CreativeMustache", entry.CompetitionType);
            Assert.NotEqual("CrazyHair", entry.CompetitionType);
        }

        // 2. Register a creative contestant
        var email = $"creative_{Guid.NewGuid():N}@example.com";
        var reg = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, "Creative Contestant", "password123", "CreativeMustache"));
        var regDoc = JsonDocument.Parse(await reg.Content.ReadAsStringAsync());
        var token = regDoc.RootElement.GetProperty("token").GetString()!;

        // 3. Submit a creative mustache photo (no clean shave required!)
        var formData = new MultipartFormDataContent();
        formData.Add(new StringContent("Paper Origami Stache Master"), "Name");
        formData.Add(new StringContent("CreativeMustache"), "CompetitionType");

        var imageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46 };
        var imageContent = new ByteArrayContent(imageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "origami_stache.jpg");

        var judgeReq = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/judge") { Content = formData };
        judgeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var judgeRes = await _client.SendAsync(judgeReq);

        Assert.Equal(HttpStatusCode.OK, judgeRes.StatusCode);
        var judgeData = JsonSerializer.Deserialize<JudgeResponseDto>(await judgeRes.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(judgeData);
        Assert.Equal("CreativeMustache", judgeData.CompetitionType);

        // 4. Verify the entry appears in the Creative leaderboard
        var updatedCreativeLb = await _client.GetAsync("/api/mustache/leaderboard?division=creative");
        var updatedCreativeResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(await updatedCreativeLb.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(updatedCreativeResult);
        Assert.Contains(updatedCreativeResult.Entries, e => e.ContestantName == "Paper Origami Stache Master");

        // 5. Verify the entry DOES NOT appear in the Natural Mustache leaderboard
        var updatedMustacheLb = await _client.GetAsync("/api/mustache/leaderboard?division=mustache");
        var updatedMustacheResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(await updatedMustacheLb.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(updatedMustacheResult);
        Assert.DoesNotContain(updatedMustacheResult.Entries, e => e.ContestantName == "Paper Origami Stache Master");
    }

    [Fact]
    public async Task JudgeEndpoint_PromptInjectionInMainChallenge_ReturnsBadRequestAndDoesNotPersist()
    {
        var (token, _) = await CreatePaidContestantWithCleanShaveAsync("Hacker Contestant");

        using var formData = new MultipartFormDataContent();
        formData.Add(new StringContent("Bobby Tables'; DROP TABLE MustacheEntries;--"), "Name");
        formData.Add(new StringContent("Mustache"), "CompetitionType");

        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "injection_stache.jpg");

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/judge") { Content = formData };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(req);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("Submission rejected", json);
        Assert.Contains("Prompt injection", json);

        var lb = await _client.GetAsync("/api/mustache/leaderboard?division=mustache");
        var lbJson = await lb.Content.ReadAsStringAsync();
        Assert.DoesNotContain("Bobby Tables", lbJson);
    }

    [Fact]
    public async Task JudgeEndpoint_PromptInjectionInCreativeChallenge_ReturnsOkAndScoresAsCreativeEntry()
    {
        var email = $"creative_hacker_{Guid.NewGuid():N}@example.com";
        var reg = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, "Cyber Mo Bro", "password123", "CreativeMustache"));
        var regDoc = JsonDocument.Parse(await reg.Content.ReadAsStringAsync());
        var token = regDoc.RootElement.GetProperty("token").GetString()!;

        using var formData = new MultipartFormDataContent();
        formData.Add(new StringContent("Bobby Tables'; DROP TABLE MustacheEntries;--"), "Name");
        formData.Add(new StringContent("CreativeMustache"), "CompetitionType");

        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "Image", "cyber_stache.jpg");

        var req = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/judge") { Content = formData };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await _client.SendAsync(req);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var judgeData = JsonSerializer.Deserialize<JudgeResponseDto>(await response.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(judgeData);
        Assert.Equal("CreativeMustache", judgeData.CompetitionType);
        Assert.False(judgeData.IsWoodenSpoon, "Wooden spoon must not be set on creative challenge injections.");
        Assert.True(judgeData.OverallScore > 0, "Creative hacks should receive a score in Creative Challenge.");
        Assert.Equal("Creative Code Maestro", judgeData.VerdictBadge);

        // Verify it appears on creative leaderboard
        var updatedCreativeLb = await _client.GetAsync("/api/mustache/leaderboard?division=creative");
        var creativeResult = JsonSerializer.Deserialize<LeaderboardResponseDto>(await updatedCreativeLb.Content.ReadAsStringAsync(), _jsonOptions);
        Assert.NotNull(creativeResult);
        Assert.Contains(creativeResult.Entries, e => e.ContestantName == "Bobby Tables'; DROP TABLE MustacheEntries;--");
    }

    [Fact]
    public async Task CleanShave_WhenNotShaven_RejectsWithBadRequest()
    {
        var email = $"not_shaven_{Guid.NewGuid():N}@example.com";
        var reg = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, "NotShavenTest User", "password123", "Mustache"));
        var regDoc = JsonDocument.Parse(await reg.Content.ReadAsStringAsync());
        var token = regDoc.RootElement.GetProperty("token").GetString()!;

        using var csFormData = new MultipartFormDataContent();
        var dummyBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        csFormData.Add(imageContent, "Image", "mustache_baseline.jpg");

        var uploadReq = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/clean-shave") { Content = csFormData };
        uploadReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var uploadRes = await _client.SendAsync(uploadReq);

        Assert.Equal(HttpStatusCode.BadRequest, uploadRes.StatusCode);
        var resJson = await uploadRes.Content.ReadAsStringAsync();
        Assert.Contains("mustache was detected", resJson);
    }

    [Fact]
    public async Task CleanShave_WhenNoFaceDetected_RejectsWithBadRequest()
    {
        var email = $"noface_{Guid.NewGuid():N}@example.com";
        var reg = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, "NoFaceTest User", "password123", "Mustache"));
        var regDoc = JsonDocument.Parse(await reg.Content.ReadAsStringAsync());
        var token = regDoc.RootElement.GetProperty("token").GetString()!;

        using var csFormData = new MultipartFormDataContent();
        var dummyBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        csFormData.Add(imageContent, "Image", "wall.jpg");

        var uploadReq = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/clean-shave") { Content = csFormData };
        uploadReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var uploadRes = await _client.SendAsync(uploadReq);

        Assert.Equal(HttpStatusCode.BadRequest, uploadRes.StatusCode);
        var resJson = await uploadRes.Content.ReadAsStringAsync();
        Assert.Contains("No human face detected", resJson);
    }

    [Fact]
    public async Task CleanShave_WhenCleanShaven_AcceptsAndSavesBaseline()
    {
        var email = $"cleanshaven_{Guid.NewGuid():N}@example.com";
        var reg = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, "Genuine Clean Shave", "password123", "Mustache"));
        var regDoc = JsonDocument.Parse(await reg.Content.ReadAsStringAsync());
        var token = regDoc.RootElement.GetProperty("token").GetString()!;

        using var csFormData = new MultipartFormDataContent();
        var dummyBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        csFormData.Add(imageContent, "Image", "clean_shave.jpg");

        var uploadReq = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/clean-shave") { Content = csFormData };
        uploadReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var uploadRes = await _client.SendAsync(uploadReq);

        Assert.Equal(HttpStatusCode.OK, uploadRes.StatusCode);
        var resJson = await uploadRes.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(resJson);
        var url = doc.RootElement.GetProperty("cleanShaveImageUrl").GetString();
        Assert.False(string.IsNullOrWhiteSpace(url));
        Assert.Contains("clean shave confirmed", doc.RootElement.GetProperty("message").GetString());
    }
}
