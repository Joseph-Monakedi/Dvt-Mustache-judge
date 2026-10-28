using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using DvtMustacheJudge.Api.Controllers;
using DvtMustacheJudge.Api.Data;
using DvtMustacheJudge.Api.Models;
using DvtMustacheJudge.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace DvtMustacheJudge.Tests;

public class AuthAndQuizTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthAndQuizTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public void TokenService_ShouldFailToStart_WhenJwtSecretMissingFromEnv()
    {
        // Empty configuration without JWT_SECRET
        var emptyConfig = new ConfigurationBuilder().Build();
        
        // Clear environment variable if set in test runner
        var prevEnv = Environment.GetEnvironmentVariable("JWT_SECRET");
        try
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", null);
            
            var ex = Assert.Throws<InvalidOperationException>(() => new TokenService(emptyConfig));
            Assert.Contains("Fatal Startup Error: Required environment variable 'JWT_SECRET' is not configured", ex.Message);
        }
        finally
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", prevEnv);
        }
    }

    [Fact]
    public void TokenService_ShouldIssueAndValidateTokens_WhenSecretConfigured()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "JWT_SECRET", "this-is-a-super-secure-32-char-token-signing-key" }
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
        var tokenService = new TokenService(config);

        var testUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "follicle.tester@dvt.co.za",
            FullName = "Follicle Tester",
            Role = "Contestant"
        };

        var token = tokenService.GenerateToken(testUser);
        Assert.NotNull(token);
        Assert.Contains(".", token);

        var payload = tokenService.ValidateToken(token);
        Assert.NotNull(payload);
        Assert.Equal(testUser.Id, payload.UserId);
        Assert.Equal(testUser.Email, payload.Email);
        Assert.Equal("Contestant", payload.Role);
    }

    [Fact]
    public async Task RegisterAndLogin_ShouldAuthenticateUser()
    {
        var email = $"user_{Guid.NewGuid()}@dvt.co.za";
        var regRequest = new RegisterRequest(email, "Mo Bro", "secret123");
        
        var regResponse = await _client.PostAsJsonAsync("/api/auth/register", regRequest);
        Assert.Equal(HttpStatusCode.OK, regResponse.StatusCode);

        var regBody = await regResponse.Content.ReadAsStringAsync();
        using var regDoc = JsonDocument.Parse(regBody);
        var token = regDoc.RootElement.GetProperty("token").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));

        // Get current user profile
        var profileRequest = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        profileRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var profileResponse = await _client.SendAsync(profileRequest);
        Assert.Equal(HttpStatusCode.OK, profileResponse.StatusCode);

        var profileBody = await profileResponse.Content.ReadAsStringAsync();
        using var profileDoc = JsonDocument.Parse(profileBody);
        Assert.Equal(email, profileDoc.RootElement.GetProperty("email").GetString());
        Assert.False(profileDoc.RootElement.GetProperty("leaderboardPaid").GetBoolean());
    }

    [Fact]
    public async Task Leaderboard_ShouldDeduplicatePerUser_AndEnforcePayment()
    {
        // 1. Create a user
        var email = $"dedup_{Guid.NewGuid()}@dvt.co.za";
        var regRequest = new RegisterRequest(email, "Deduplication King", "pass123");
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", regRequest);
        var regJson = await regRes.Content.ReadAsStringAsync();
        using var regDoc = JsonDocument.Parse(regJson);
        var userId = regDoc.RootElement.GetProperty("id").GetGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Add 2 entries for this user: score 60 and score 95
            var entry1 = new MustacheEntry
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ContestantName = "Deduplication King",
                ImageUrl = "/mock1.jpg",
                ThumbnailUrl = "/thumb1.jpg",
                OverallScore = 60,
                StyleCategory = "Chevron",
                CreatedAt = DateTime.UtcNow.AddMinutes(-10),
                IsWoodenSpoon = false,
                IsHidden = false
            };

            var entry2 = new MustacheEntry
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ContestantName = "Deduplication King",
                ImageUrl = "/mock2.jpg",
                ThumbnailUrl = "/thumb2.jpg",
                OverallScore = 95,
                StyleCategory = "Chevron",
                CreatedAt = DateTime.UtcNow,
                IsWoodenSpoon = false,
                IsHidden = false
            };

            db.MustacheEntries.AddRange(entry1, entry2);
            await db.SaveChangesAsync();
        }

        // Leaderboard check: anyone can participate on the leaderboard!
        // Should be deduplicated to only the top entry (score 95), initially not prize eligible
        var lbResUnpaid = await _client.GetAsync("/api/mustache/leaderboard?limit=100");
        var lbBodyUnpaid = await lbResUnpaid.Content.ReadAsStringAsync();
        using var lbDocUnpaid = JsonDocument.Parse(lbBodyUnpaid);
        var entriesUnpaid = lbDocUnpaid.RootElement.GetProperty("entries").EnumerateArray()
            .Where(e => e.GetProperty("contestantName").GetString() == "Deduplication King")
            .ToList();

        Assert.Single(entriesUnpaid);
        Assert.Equal(95, entriesUnpaid[0].GetProperty("overallScore").GetInt32());
        Assert.False(entriesUnpaid[0].GetProperty("isPrizeEligible").GetBoolean());

        // Admin confirms donation (R100) and marks as prize eligible
        var adminDonationReq = new HttpRequestMessage(HttpMethod.Post, $"/api/mustache/admin/contestant/{userId}/set-donation")
        {
            Content = JsonContent.Create(new SetDonationRequest(true, 100))
        };
        adminDonationReq.Headers.Add("X-Admin-Password", "dvt-movember-admin-2026");
        var donationRes = await _client.SendAsync(adminDonationReq);
        Assert.Equal(HttpStatusCode.OK, donationRes.StatusCode);

        // Leaderboard check again: ONLY top entry (score 95) is present and is now prize eligible!
        var lbResPaid = await _client.GetAsync("/api/mustache/leaderboard?limit=100");
        var lbBodyPaid = await lbResPaid.Content.ReadAsStringAsync();
        using var lbDocPaid = JsonDocument.Parse(lbBodyPaid);
        var matchingEntries = lbDocPaid.RootElement.GetProperty("entries").EnumerateArray()
            .Where(e => e.GetProperty("contestantName").GetString() == "Deduplication King")
            .ToList();

        Assert.Single(matchingEntries);
        Assert.Equal(95, matchingEntries[0].GetProperty("overallScore").GetInt32());
        Assert.True(matchingEntries[0].GetProperty("isPrizeEligible").GetBoolean());
    }

    [Fact]
    public async Task QuizArena_ShouldEnforceR50Fee_AndScoreCorrectAnswers()
    {
        // 1. Create user
        var email = $"quiz_{Guid.NewGuid()}@dvt.co.za";
        var regRequest = new RegisterRequest(email, "Quiz Champion", "pass123");
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", regRequest);
        var regJson = await regRes.Content.ReadAsStringAsync();
        using var regDoc = JsonDocument.Parse(regJson);
        var userId = regDoc.RootElement.GetProperty("id").GetGuid();
        var token = regDoc.RootElement.GetProperty("token").GetString();

        // 1.5 Get active quiz PIN
        var quizStateRes = await _client.GetAsync("/api/quiz/current");
        var quizStateJson = await quizStateRes.Content.ReadAsStringAsync();
        using var quizStateDoc = JsonDocument.Parse(quizStateJson);
        var activePin = quizStateDoc.RootElement.GetProperty("pinCode").GetString()!;

        // 2. Try to join quiz before paying R50 fee -> Expect 403 Forbidden
        var joinReq = new HttpRequestMessage(HttpMethod.Post, "/api/quiz/join");
        joinReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        joinReq.Content = JsonContent.Create(new JoinQuizRequest(activePin, "Quiz Champion"));
        var joinRes = await _client.SendAsync(joinReq);
        Assert.Equal(HttpStatusCode.Forbidden, joinRes.StatusCode);

        // 3. Admin approves R50 quiz pass
        var adminQuizToggle = new HttpRequestMessage(HttpMethod.Post, $"/api/mustache/admin/contestant/{userId}/toggle-quiz-paid");
        adminQuizToggle.Headers.Add("X-Admin-Password", "dvt-movember-admin-2026");
        var adminRes = await _client.SendAsync(adminQuizToggle);
        Assert.Equal(HttpStatusCode.OK, adminRes.StatusCode);

        // 4. Now join quiz -> Expect OK
        var joinReq2 = new HttpRequestMessage(HttpMethod.Post, "/api/quiz/join");
        joinReq2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        joinReq2.Content = JsonContent.Create(new JoinQuizRequest(activePin, "Quiz Champion"));
        var joinRes2 = await _client.SendAsync(joinReq2);
        Assert.Equal(HttpStatusCode.OK, joinRes2.StatusCode);

        var joinBody = await joinRes2.Content.ReadAsStringAsync();
        using var joinDoc = JsonDocument.Parse(joinBody);
        var playerId = joinDoc.RootElement.GetProperty("playerId").GetGuid();

        // 4.5 Admin starts Question 1 (index 0)
        var startReq = new HttpRequestMessage(HttpMethod.Post, "/api/quiz/admin/next-question");
        startReq.Headers.Add("X-Admin-Password", "dvt-movember-admin-2026");
        startReq.Content = JsonContent.Create(new AdminNextQuestionRequest(0));
        var startRes = await _client.SendAsync(startReq);
        Assert.Equal(HttpStatusCode.OK, startRes.StatusCode);

        // 5. Get current quiz question
        var currentRes = await _client.GetAsync("/api/quiz/current");
        Assert.Equal(HttpStatusCode.OK, currentRes.StatusCode);
        var currentBody = await currentRes.Content.ReadAsStringAsync();
        using var currentDoc = JsonDocument.Parse(currentBody);
        var questionId = currentDoc.RootElement.GetProperty("currentQuestion").GetProperty("id").GetGuid();

        // 6. Answer correctly (Tom Selleck is option 0 for Q1)
        var answerReq = new SubmitAnswerRequest(playerId, questionId, 0, 1500);
        var answerRes = await _client.PostAsJsonAsync("/api/quiz/answer", answerReq);
        Assert.Equal(HttpStatusCode.OK, answerRes.StatusCode);

        var answerBody = await answerRes.Content.ReadAsStringAsync();
        using var answerDoc = JsonDocument.Parse(answerBody);
        Assert.True(answerDoc.RootElement.GetProperty("isCorrect").GetBoolean());
        Assert.True(answerDoc.RootElement.GetProperty("pointsEarned").GetInt32() >= 500);
        Assert.Equal(1, answerDoc.RootElement.GetProperty("streak").GetInt32());
    }

    [Fact]
    public async Task CleanShave_UploadEndpoint_ShouldSaveBaselinePhoto_AndReflectInProfile()
    {
        // 1. Register a contestant
        var email = $"cleanshave_{Guid.NewGuid()}@dvt.co.za";
        var regRequest = new RegisterRequest(email, "Clean Shave Mo", "pass123");
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", regRequest);
        var regJson = await regRes.Content.ReadAsStringAsync();
        using var regDoc = JsonDocument.Parse(regJson);
        var token = regDoc.RootElement.GetProperty("token").GetString();
        Assert.NotNull(token);

        // 2. Upload Day 1 Clean Shave baseline photo
        using var formData = new MultipartFormDataContent();
        var dummyImageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var imageContent = new ByteArrayContent(dummyImageBytes);
        imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        formData.Add(imageContent, "image", "day1_cleanshave.jpg");

        var uploadReq = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/clean-shave")
        {
            Content = formData
        };
        uploadReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var uploadRes = await _client.SendAsync(uploadReq);

        Assert.Equal(HttpStatusCode.OK, uploadRes.StatusCode);
        var uploadJson = await uploadRes.Content.ReadAsStringAsync();
        using var uploadDoc = JsonDocument.Parse(uploadJson);
        var cleanShaveUrl = uploadDoc.RootElement.GetProperty("cleanShaveImageUrl").GetString();
        Assert.False(string.IsNullOrWhiteSpace(cleanShaveUrl));

        // 3. Verify /api/auth/me reflects the baseline photo
        var meReq = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        meReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var meRes = await _client.SendAsync(meReq);
        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);

        var meJson = await meRes.Content.ReadAsStringAsync();
        using var meDoc = JsonDocument.Parse(meJson);
        var profileCleanShaveUrl = meDoc.RootElement.GetProperty("cleanShaveImageUrl").GetString();
        Assert.Equal(cleanShaveUrl, profileCleanShaveUrl);
    }

    [Fact]
    public async Task MustacheJudge_WithCleanShaveBaseline_EvaluatesGrowthAlongsideCleanShave()
    {
        // 1. Register a contestant
        var email = $"growth_{Guid.NewGuid()}@dvt.co.za";
        var regRequest = new RegisterRequest(email, "Growth Hero", "pass123");
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", regRequest);
        var regJson = await regRes.Content.ReadAsStringAsync();
        using var regDoc = JsonDocument.Parse(regJson);
        var token = regDoc.RootElement.GetProperty("token").GetString();
        var userId = regDoc.RootElement.GetProperty("id").GetGuid();

        // 2. Upload Day 1 Clean Shave
        using var csFormData = new MultipartFormDataContent();
        var dummyCsBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var csImageContent = new ByteArrayContent(dummyCsBytes);
        csImageContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        csFormData.Add(csImageContent, "image", "baseline.jpg");

        var uploadReq = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/clean-shave")
        {
            Content = csFormData
        };
        uploadReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var uploadRes = await _client.SendAsync(uploadReq);
        Assert.Equal(HttpStatusCode.OK, uploadRes.StatusCode);

        // 3. Admin approves leaderboard fee
        var adminToggle = new HttpRequestMessage(HttpMethod.Post, $"/api/mustache/admin/contestant/{userId}/toggle-leaderboard-paid");
        adminToggle.Headers.Add("X-Admin-Password", "dvt-movember-admin-2026");
        await _client.SendAsync(adminToggle);

        // 4. Submit mustache photo for judging
        using var judgeForm = new MultipartFormDataContent();
        judgeForm.Add(new StringContent("Growth Hero"), "Name");

        var dummyMustacheBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00 };
        var mContent = new ByteArrayContent(dummyMustacheBytes);
        mContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        judgeForm.Add(mContent, "Image", "movember_growth.jpg");

        var judgeReq = new HttpRequestMessage(HttpMethod.Post, "/api/mustache/judge")
        {
            Content = judgeForm
        };
        judgeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var judgeRes = await _client.SendAsync(judgeReq);

        Assert.Equal(HttpStatusCode.OK, judgeRes.StatusCode);
        var judgeJson = await judgeRes.Content.ReadAsStringAsync();
        using var judgeDoc = JsonDocument.Parse(judgeJson);

        var entryId = judgeDoc.RootElement.GetProperty("id").GetGuid();
        var cleanShaveUrl = judgeDoc.RootElement.GetProperty("cleanShaveImageUrl").GetString();
        var growthScore = judgeDoc.RootElement.GetProperty("growthScore").GetInt32();
        var growthAnalysis = judgeDoc.RootElement.GetProperty("growthAnalysis").GetString();

        Assert.False(string.IsNullOrWhiteSpace(cleanShaveUrl));
        Assert.True(growthScore >= 10);
        Assert.False(string.IsNullOrWhiteSpace(growthAnalysis));

        // 5. Leaderboard shows ONLY the after photo thumbnail, while entry detail modal shows both before and after
        var lbRes = await _client.GetAsync("/api/mustache/leaderboard?limit=50");
        var lbJson = await lbRes.Content.ReadAsStringAsync();
        using var lbDoc = JsonDocument.Parse(lbJson);
        var entries = lbDoc.RootElement.GetProperty("entries");
        Assert.True(entries.GetArrayLength() > 0);

        // 6. Detailed view endpoint /api/mustache/entry/{id} provides both cleanShaveImageUrl and imageUrl
        var detailRes = await _client.GetAsync($"/api/mustache/entry/{entryId}");
        Assert.Equal(HttpStatusCode.OK, detailRes.StatusCode);
        var detailJson = await detailRes.Content.ReadAsStringAsync();
        using var detailDoc = JsonDocument.Parse(detailJson);
        Assert.Equal(cleanShaveUrl, detailDoc.RootElement.GetProperty("cleanShaveImageUrl").GetString());
        Assert.False(string.IsNullOrWhiteSpace(detailDoc.RootElement.GetProperty("imageUrl").GetString()));
    }

    [Fact]
    public async Task Quiz_HostCanLaunchNextQuestionBeforeTimerRunsOut_AndStaleTimerOrRevealDoesNotCloseCurrentQuestion()
    {
        // 1. Reset to lobby
        var lobbyReq = new HttpRequestMessage(HttpMethod.Post, "/api/quiz/admin/start-lobby");
        lobbyReq.Headers.Add("X-Admin-Password", "dvt-movember-admin-2026");
        var lobbyRes = await _client.SendAsync(lobbyReq);
        Assert.Equal(HttpStatusCode.OK, lobbyRes.StatusCode);

        // 2. Launch Question 1 (index 0)
        var q1Req = new HttpRequestMessage(HttpMethod.Post, "/api/quiz/admin/next-question");
        q1Req.Headers.Add("X-Admin-Password", "dvt-movember-admin-2026");
        var q1Res = await _client.SendAsync(q1Req);
        Assert.Equal(HttpStatusCode.OK, q1Res.StatusCode);

        var q1Json = await q1Res.Content.ReadAsStringAsync();
        using var q1Doc = JsonDocument.Parse(q1Json);
        var q1Id = q1Doc.RootElement.GetProperty("question").GetProperty("id").GetGuid();
        Assert.Equal(0, q1Doc.RootElement.GetProperty("questionIndex").GetInt32());
        Assert.Equal("Question", q1Doc.RootElement.GetProperty("status").GetString());

        // 3. Launch Question 2 (index 1) immediately BEFORE question 1's timer runs out
        var q2Req = new HttpRequestMessage(HttpMethod.Post, "/api/quiz/admin/next-question");
        q2Req.Headers.Add("X-Admin-Password", "dvt-movember-admin-2026");
        var q2Res = await _client.SendAsync(q2Req);
        Assert.Equal(HttpStatusCode.OK, q2Res.StatusCode);

        var q2Json = await q2Res.Content.ReadAsStringAsync();
        using var q2Doc = JsonDocument.Parse(q2Json);
        Assert.Equal(1, q2Doc.RootElement.GetProperty("questionIndex").GetInt32());
        Assert.Equal("Question", q2Doc.RootElement.GetProperty("status").GetString());
        Assert.True(q2Doc.RootElement.GetProperty("remainingSeconds").GetDouble() > 0);

        // 4. Simulate a stale client sending reveal-round for Question 1 (index 0 / q1Id)
        var staleRevealReq = new HttpRequestMessage(HttpMethod.Post, "/api/quiz/admin/reveal-round");
        staleRevealReq.Headers.Add("X-Admin-Password", "dvt-movember-admin-2026");
        staleRevealReq.Content = JsonContent.Create(new AdminRevealRoundRequest(QuestionIndex: 0, QuestionId: q1Id));
        var staleRevealRes = await _client.SendAsync(staleRevealReq);
        Assert.Equal(HttpStatusCode.OK, staleRevealRes.StatusCode);

        // 5. Verify the active quiz state is STILL "Question" on Question 2 (NOT closed!)
        var currentRes = await _client.GetAsync("/api/quiz/current");
        Assert.Equal(HttpStatusCode.OK, currentRes.StatusCode);
        var currentJson = await currentRes.Content.ReadAsStringAsync();
        using var currentDoc = JsonDocument.Parse(currentJson);

        Assert.Equal("Question", currentDoc.RootElement.GetProperty("status").GetString());
        Assert.Equal(1, currentDoc.RootElement.GetProperty("currentQuestionIndex").GetInt32());
    }

    [Fact]
    public async Task ForgotPassword_WhenUserExists_ShouldGenerateTokenAndReturnSpamNotice()
    {
        // 1. Register a test contestant
        var email = $"forgot.{Guid.NewGuid():N}@dvt.co.za";
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            Email: email,
            FullName: "Forgot Tester",
            Password: "InitialPassword123!"
        ));
        Assert.Equal(HttpStatusCode.OK, regRes.StatusCode);

        // 2. Request password reset
        var forgotRes = await _client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest(Email: email));
        Assert.Equal(HttpStatusCode.OK, forgotRes.StatusCode);

        var forgotJson = await forgotRes.Content.ReadAsStringAsync();
        using var forgotDoc = JsonDocument.Parse(forgotJson);
        var msg = forgotDoc.RootElement.GetProperty("message").GetString();
        Assert.NotNull(msg);
        Assert.Contains("spam or junk folder", msg, StringComparison.OrdinalIgnoreCase);

        // 3. Verify user in DB has generated reset token and valid expiration
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = db.Users.FirstOrDefault(u => u.Email == email.ToLower());
        Assert.NotNull(user);
        Assert.NotNull(user.PasswordResetToken);
        Assert.NotEmpty(user.PasswordResetToken);
        Assert.NotNull(user.PasswordResetTokenExpiresAt);
        Assert.True(user.PasswordResetTokenExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task ForgotPassword_WhenUserDoesNotExist_ShouldReturnOkWithoutRevealingUserMissing()
    {
        var nonExistentEmail = $"ghost.{Guid.NewGuid():N}@dvt.co.za";
        var forgotRes = await _client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest(Email: nonExistentEmail));
        Assert.Equal(HttpStatusCode.OK, forgotRes.StatusCode);

        var forgotJson = await forgotRes.Content.ReadAsStringAsync();
        using var forgotDoc = JsonDocument.Parse(forgotJson);
        var msg = forgotDoc.RootElement.GetProperty("message").GetString();
        Assert.NotNull(msg);
        Assert.Contains("spam or junk folder", msg, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ResetPassword_WithInvalidToken_ShouldReturnBadRequest()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(
            Token: "completely-bogus-token-12345",
            Email: "someone@dvt.co.za",
            NewPassword: "BrandNewSecurePassword123!"
        ));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_WithValidToken_ShouldChangePasswordAndPermitNewLogin()
    {
        // 1. Register a test user
        var email = $"resettable.{Guid.NewGuid():N}@dvt.co.za";
        var originalPassword = "OriginalSecretPassword1!";
        var newPassword = "UpdatedSecurePassword2!";

        var regRes = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            Email: email,
            FullName: "Reset Champion",
            Password: originalPassword
        ));
        Assert.Equal(HttpStatusCode.OK, regRes.StatusCode);

        // 2. Request forgot-password to trigger token generation
        var forgotRes = await _client.PostAsJsonAsync("/api/auth/forgot-password", new ForgotPasswordRequest(Email: email));
        Assert.Equal(HttpStatusCode.OK, forgotRes.StatusCode);

        // 3. Retrieve token from database
        string resetToken;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var dbUser = db.Users.First(u => u.Email == email.ToLower());
            resetToken = dbUser.PasswordResetToken!;
        }
        Assert.NotNull(resetToken);

        // 4. Perform password reset
        var resetRes = await _client.PostAsJsonAsync("/api/auth/reset-password", new ResetPasswordRequest(
            Token: resetToken,
            Email: email,
            NewPassword: newPassword
        ));
        Assert.Equal(HttpStatusCode.OK, resetRes.StatusCode);

        // 5. In DB, token should now be cleared
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var dbUser = db.Users.First(u => u.Email == email.ToLower());
            Assert.Null(dbUser.PasswordResetToken);
            Assert.Null(dbUser.PasswordResetTokenExpiresAt);
        }

        // 6. Old password fails
        var failedLogin = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(Email: email, Password: originalPassword));
        Assert.Equal(HttpStatusCode.Unauthorized, failedLogin.StatusCode);

        // 7. New password succeeds
        var successLogin = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(Email: email, Password: newPassword));
        Assert.Equal(HttpStatusCode.OK, successLogin.StatusCode);

        var loginJson = await successLogin.Content.ReadAsStringAsync();
        using var loginDoc = JsonDocument.Parse(loginJson);
        Assert.True(loginDoc.RootElement.TryGetProperty("token", out var tokenProp));
        Assert.NotEmpty(tokenProp.GetString()!);
    }

    [Fact]
    public async Task Admin_ShouldBeAbleToDeleteContestantAccount()
    {
        // 1. Create a user with an entry
        var email = $"delete_user_{Guid.NewGuid()}@dvt.co.za";
        var regRes = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, "To Be Deleted", "password123", "Mustache"));
        Assert.Equal(HttpStatusCode.OK, regRes.StatusCode);

        Guid userId;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = db.Users.First(u => u.Email == email.ToLower());
            userId = user.Id;

            db.MustacheEntries.Add(new MustacheEntry
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ContestantName = "To Be Deleted",
                ImageUrl = "/mock_del.jpg",
                ThumbnailUrl = "/thumb_del.jpg",
                OverallScore = 70,
                CompetitionType = "Mustache"
            });
            await db.SaveChangesAsync();
        }

        // 2. Admin deletes user
        var deleteReq = new HttpRequestMessage(HttpMethod.Delete, $"/api/mustache/admin/contestant/{userId}");
        deleteReq.Headers.Add("X-Admin-Password", "dvt-movember-admin-2026");
        var deleteRes = await _client.SendAsync(deleteReq);
        Assert.Equal(HttpStatusCode.OK, deleteRes.StatusCode);

        // 3. User and entries should be gone from DB
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Null(await db.Users.FindAsync(userId));
            Assert.False(await db.MustacheEntries.AnyAsync(e => e.UserId == userId));
        }
    }
}
