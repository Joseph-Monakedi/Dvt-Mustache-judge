using DvtMustacheJudge.Api.Models;
using DvtMustacheJudge.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace DvtMustacheJudge.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context, IConfiguration? config = null)
    {
        // 1. Purge all tables from scratch if not already purged for V3 schema
        try
        {
            var checkMarkerSql = @"
                CREATE TABLE IF NOT EXISTS ""__SchemaPurgeV3"" (
                    ""PurgedAt"" timestamp with time zone NOT NULL PRIMARY KEY
                );
            ";
            await context.Database.ExecuteSqlRawAsync(checkMarkerSql);

            var alreadyPurged = await context.Database.SqlQueryRaw<int>(@"SELECT COUNT(*)::int AS ""Value"" FROM ""__SchemaPurgeV3""").FirstOrDefaultAsync();
            if (alreadyPurged == 0)
            {
                // Purge all legacy tables completely as requested
                var purgeSql = @"
                    DROP TABLE IF EXISTS ""QuizPlayerAnswers"", ""QuizPlayers"", ""QuizQuestions"", ""QuizGames"", ""MustacheEntries"", ""Users"" CASCADE;
                    INSERT INTO ""__SchemaPurgeV3"" (""PurgedAt"") VALUES (CURRENT_TIMESTAMP);
                ";
                await context.Database.ExecuteSqlRawAsync(purgeSql);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DB Purge notice: {ex.Message}");
        }

        // 2. Ensure fresh schema tables exist without OfficeLocation
        try
        {
            var schemaSql = @"
                CREATE TABLE IF NOT EXISTS ""MustacheEntries"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""ContestantName"" character varying(100) NOT NULL,
                    ""ImageUrl"" text NOT NULL,
                    ""ThumbnailUrl"" text,
                    ""OverallScore"" integer NOT NULL DEFAULT 0,
                    ""DensityScore"" integer NOT NULL DEFAULT 0,
                    ""SymmetryScore"" integer NOT NULL DEFAULT 0,
                    ""SwaggerScore"" integer NOT NULL DEFAULT 0,
                    ""IsWoodenSpoon"" boolean NOT NULL DEFAULT false,
                    ""WoodenSpoonReason"" character varying(100),
                    ""InnovationScore"" integer NOT NULL DEFAULT 0,
                    ""DedicationScore"" integer NOT NULL DEFAULT 0,
                    ""FunninessScore"" integer NOT NULL DEFAULT 0,
                    ""MustacheTitle"" character varying(150),
                    ""StyleCategory"" character varying(50),
                    ""RoastCommentary"" text,
                    ""CelebrityTwin"" character varying(100),
                    ""VerdictBadge"" character varying(100),
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    ""IsHidden"" boolean NOT NULL DEFAULT false,
                    ""UserId"" uuid,
                    ""CleanShaveImageUrl"" text,
                    ""GrowthScore"" integer NOT NULL DEFAULT 0,
                    ""GrowthAnalysis"" text
                );

                CREATE TABLE IF NOT EXISTS ""Users"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""Email"" character varying(120) NOT NULL UNIQUE,
                    ""FullName"" character varying(100) NOT NULL,
                    ""PasswordHash"" text NOT NULL,
                    ""Salt"" text NOT NULL,
                    ""Role"" character varying(20) NOT NULL DEFAULT 'Contestant',
                    ""LeaderboardPaid"" boolean NOT NULL DEFAULT false,
                    ""QuizPaid"" boolean NOT NULL DEFAULT false,
                    ""CleanShaveImageUrl"" text,
                    ""CleanShaveUploadedAt"" timestamp with time zone,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS ""QuizGames"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""Title"" character varying(150) NOT NULL,
                    ""Status"" character varying(30) NOT NULL DEFAULT 'Lobby',
                    ""PinCode"" character varying(10) NOT NULL,
                    ""CurrentQuestionIndex"" integer NOT NULL DEFAULT 0,
                    ""QuestionStartTime"" timestamp with time zone,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS ""QuizQuestions"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""QuizGameId"" uuid NOT NULL,
                    ""QuestionOrder"" integer NOT NULL DEFAULT 0,
                    ""QuestionText"" character varying(300) NOT NULL,
                    ""ImageUrl"" text,
                    ""OptionA"" character varying(150) NOT NULL,
                    ""OptionB"" character varying(150) NOT NULL,
                    ""OptionC"" character varying(150) NOT NULL,
                    ""OptionD"" character varying(150) NOT NULL,
                    ""CorrectOption"" integer NOT NULL DEFAULT 0,
                    ""TimeLimitSeconds"" integer NOT NULL DEFAULT 20,
                    ""Points"" integer NOT NULL DEFAULT 1000
                );

                CREATE TABLE IF NOT EXISTS ""QuizPlayers"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""QuizGameId"" uuid NOT NULL,
                    ""UserId"" uuid,
                    ""ContestantName"" character varying(100) NOT NULL,
                    ""TotalScore"" integer NOT NULL DEFAULT 0,
                    ""Streak"" integer NOT NULL DEFAULT 0,
                    ""JoinedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS ""QuizPlayerAnswers"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""QuizPlayerId"" uuid NOT NULL,
                    ""QuizQuestionId"" uuid NOT NULL,
                    ""SelectedOption"" integer NOT NULL,
                    ""IsCorrect"" boolean NOT NULL DEFAULT false,
                    ""ResponseTimeMs"" integer NOT NULL DEFAULT 0,
                    ""PointsEarned"" integer NOT NULL DEFAULT 0,
                    ""AnsweredAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS ""PaymentTransactions"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""UserId"" uuid NOT NULL,
                    ""ItemType"" character varying(50) NOT NULL,
                    ""Amount"" numeric(10,2) NOT NULL DEFAULT 0,
                    ""Status"" character varying(30) NOT NULL DEFAULT 'Pending',
                    ""PayfastPaymentId"" character varying(100),
                    ""PaymentReference"" character varying(100) NOT NULL,
                    ""CustomerEmail"" character varying(120),
                    ""CustomerName"" character varying(100),
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    ""CompletedAt"" timestamp with time zone
                );

                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""PaymentMethod"" character varying(50);
                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""PayfastPaymentId"" character varying(100);
                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""AmountPaid"" numeric(10,2);
                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""PaidAt"" timestamp with time zone;
                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""PasswordResetToken"" text;
                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""PasswordResetTokenExpiresAt"" timestamp with time zone;
                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""PreferredCompetition"" character varying(50) DEFAULT 'Mustache';
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""CompetitionType"" character varying(50) DEFAULT 'Mustache';

                -- Ensure existing creative entries, faux mustaches, and craft entries are categorized correctly as CreativeMustache
                UPDATE ""MustacheEntries"" 
                SET ""CompetitionType"" = 'CreativeMustache' 
                WHERE ""IsWoodenSpoon"" = true 
                   OR ""CompetitionType"" ILIKE '%creative%' 
                   OR ""CompetitionType"" ILIKE '%hair%';

                UPDATE ""MustacheEntries"" e 
                SET ""CompetitionType"" = 'CreativeMustache' 
                FROM ""Users"" u 
                WHERE e.""UserId"" = u.""Id"" 
                  AND (u.""PreferredCompetition"" ILIKE '%creative%' OR u.""PreferredCompetition"" ILIKE '%hair%');

                -- Ensure wooden spoon division is cleared completely
                UPDATE ""MustacheEntries""
                SET ""IsWoodenSpoon"" = false,
                    ""WoodenSpoonReason"" = NULL;
            ";
            await context.Database.ExecuteSqlRawAsync(schemaSql);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Schema migration notice: {ex.Message}");
        }

        // 3. Seed Default Admin User
        try
        {
            var adminEmail = "admin@dvt.co.za";
            var existingAdmin = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == adminEmail);
            if (existingAdmin == null)
            {
                var adminPassword = config?["Admin:Password"] ?? "dvt-movember-admin-2026";
                var (hash, salt) = PasswordHasher.HashPassword(adminPassword);
                var adminUser = new User
                {
                    Id = Guid.NewGuid(),
                    Email = adminEmail,
                    FullName = "Movember Admin",
                    PasswordHash = hash,
                    Salt = salt,
                    Role = "Admin",
                    LeaderboardPaid = true,
                    QuizPaid = true,
                    CreatedAt = DateTime.UtcNow
                };
                context.Users.Add(adminUser);
                await context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Admin seed notice: {ex.Message}");
        }

        // 4. Seed Default Movember Quiz Arena with random 6-digit PIN
        try
        {
            var quiz = await context.QuizGames
                .Include(q => q.Questions)
                .OrderByDescending(q => q.CreatedAt)
                .FirstOrDefaultAsync();

            if (quiz == null)
            {
                var initialPin = Random.Shared.Next(100000, 999999).ToString();
                quiz = new QuizGame
                {
                    Id = Guid.NewGuid(),
                    Title = "Movember Grand Mustache Quiz Arena",
                    Status = "Lobby",
                    PinCode = initialPin,
                    CurrentQuestionIndex = 0,
                    CreatedAt = DateTime.UtcNow
                };

                quiz.Questions = OfficialQuizQuestions.CreateDefaultQuestions(quiz.Id);
                context.QuizGames.Add(quiz);
                await context.SaveChangesAsync();
            }
            else if (quiz.Questions.Count != 12)
            {
                // Synchronize existing quiz with official 12 questions
                var oldAnswers = await context.QuizPlayerAnswers.ToListAsync();
                context.QuizPlayerAnswers.RemoveRange(oldAnswers);
                context.QuizQuestions.RemoveRange(quiz.Questions);
                await context.SaveChangesAsync();

                var newQuestions = OfficialQuizQuestions.CreateDefaultQuestions(quiz.Id);
                context.QuizQuestions.AddRange(newQuestions);
                quiz.CurrentQuestionIndex = 0;
                quiz.Status = "Lobby";
                await context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Quiz seed notice: {ex.Message}");
        }
    }
}
