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
            var hasQuiz = await context.QuizGames.AnyAsync();
            if (!hasQuiz)
            {
                var initialPin = Random.Shared.Next(100000, 999999).ToString();
                var quiz = new QuizGame
                {
                    Id = Guid.NewGuid(),
                    Title = "Movember Grand Mustache Quiz Arena",
                    Status = "Lobby",
                    PinCode = initialPin,
                    CurrentQuestionIndex = 0,
                    CreatedAt = DateTime.UtcNow
                };

                quiz.Questions = new List<QuizQuestion>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        QuizGameId = quiz.Id,
                        QuestionOrder = 1,
                        QuestionText = "Which famous 1980s private investigator rocked the world's most iconic Chevron mustache?",
                        OptionA = "Magnum P.I. (Tom Selleck)", // Correct
                        OptionB = "Sherlock Holmes",
                        OptionC = "Lt. Columbo",
                        OptionD = "Inspector Clouseau",
                        CorrectOption = 0,
                        TimeLimitSeconds = 20,
                        Points = 1000
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        QuizGameId = quiz.Id,
                        QuestionOrder = 2,
                        QuestionText = "What is the primary global cause and health mission supported by Movember?",
                        OptionA = "Free barber styling products",
                        OptionB = "Men's mental health, prostate & testicular cancer awareness", // Correct
                        OptionC = "Artisan beard oil manufacturing",
                        OptionD = "Promoting clean-shaven faces",
                        CorrectOption = 1,
                        TimeLimitSeconds = 20,
                        Points = 1000
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        QuizGameId = quiz.Id,
                        QuestionOrder = 3,
                        QuestionText = "In the Mustache Judge rubric, what 3 dimensions determine your official score?",
                        OptionA = "Length, Curl & Bristle Shine",
                        OptionB = "Beard Ratio, Jawline & Smile",
                        OptionC = "Density, Symmetry & Swagger", // Correct
                        OptionD = "Thickness, Age & Razor Sharpness",
                        CorrectOption = 2,
                        TimeLimitSeconds = 20,
                        Points = 1000
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        QuizGameId = quiz.Id,
                        QuestionOrder = 4,
                        QuestionText = "Which iconic Queen frontman made the Chevron mustache legendary on stage at Live Aid 1985?",
                        OptionA = "David Bowie",
                        OptionB = "Freddie Mercury", // Correct
                        OptionC = "Mick Jagger",
                        OptionD = "Elton John",
                        CorrectOption = 1,
                        TimeLimitSeconds = 20,
                        Points = 1000
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        QuizGameId = quiz.Id,
                        QuestionOrder = 5,
                        QuestionText = "What is the official entry fee to feature your mustache on the live Leaderboard?",
                        OptionA = "Free",
                        OptionB = "R50",
                        OptionC = "R100", // Correct
                        OptionD = "R250",
                        CorrectOption = 2,
                        TimeLimitSeconds = 15,
                        Points = 1000
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        QuizGameId = quiz.Id,
                        QuestionOrder = 6,
                        QuestionText = "Which mustache style is distinguished by long curled tips pointing gracefully upwards toward the cheeks?",
                        OptionA = "The Walrus",
                        OptionB = "The Pencil",
                        OptionC = "The Horseshoe",
                        OptionD = "The Handlebar", // Correct
                        CorrectOption = 3,
                        TimeLimitSeconds = 20,
                        Points = 1000
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        QuizGameId = quiz.Id,
                        QuestionOrder = 7,
                        QuestionText = "If an entry is classified into the Wooden Spoon division, what did the contestant submit?",
                        OptionA = "A drawing, doodle, cartoon or non-human filter", // Correct
                        OptionB = "A freshly groomed 10/10 handlebar",
                        OptionC = "An official executive photo",
                        OptionD = "A photo with too much beard wax",
                        CorrectOption = 0,
                        TimeLimitSeconds = 20,
                        Points = 1000
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        QuizGameId = quiz.Id,
                        QuestionOrder = 8,
                        QuestionText = "What is the ultimate spirit of the Movember Mustache Challenge?",
                        OptionA = "Personal vanity",
                        OptionB = "Global solidarity, laughter, and men's health awareness", // Correct
                        OptionC = "Winning a lifetime supply of razor blades",
                        OptionD = "Skipping all video calls",
                        CorrectOption = 1,
                        TimeLimitSeconds = 15,
                        Points = 1000
                    }
                };

                context.QuizGames.Add(quiz);
                await context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Quiz seed notice: {ex.Message}");
        }
    }
}
