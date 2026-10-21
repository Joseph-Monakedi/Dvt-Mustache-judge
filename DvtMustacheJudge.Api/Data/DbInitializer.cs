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
        // 1. Ensure database tables exist and execute idempotent schema migrations
        try
        {
            var databaseCreator = (RelationalDatabaseCreator)context.Database.GetService<IDatabaseCreator>();
            await databaseCreator.CreateTablesAsync();
        }
        catch
        {
            // Primary table exists
        }

        try
        {
            var migrationSql = @"
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""IsWoodenSpoon"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""WoodenSpoonReason"" character varying(100);
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""InnovationScore"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""DedicationScore"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""FunninessScore"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""UserId"" uuid;
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""CleanShaveImageUrl"" text;
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""GrowthScore"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""GrowthAnalysis"" text;

                CREATE TABLE IF NOT EXISTS ""Users"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""Email"" character varying(120) NOT NULL UNIQUE,
                    ""FullName"" character varying(100) NOT NULL,
                    ""OfficeLocation"" character varying(100) NOT NULL DEFAULT 'Johannesburg',
                    ""PasswordHash"" text NOT NULL,
                    ""Salt"" text NOT NULL,
                    ""Role"" character varying(20) NOT NULL DEFAULT 'Contestant',
                    ""LeaderboardPaid"" boolean NOT NULL DEFAULT false,
                    ""QuizPaid"" boolean NOT NULL DEFAULT false,
                    ""CleanShaveImageUrl"" text,
                    ""CleanShaveUploadedAt"" timestamp with time zone,
                    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""CleanShaveImageUrl"" text;
                ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""CleanShaveUploadedAt"" timestamp with time zone;

                CREATE TABLE IF NOT EXISTS ""QuizGames"" (
                    ""Id"" uuid NOT NULL PRIMARY KEY,
                    ""Title"" character varying(150) NOT NULL,
                    ""Status"" character varying(30) NOT NULL DEFAULT 'Lobby',
                    ""PinCode"" character varying(10) NOT NULL DEFAULT '69420',
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
                    ""OfficeLocation"" character varying(100) NOT NULL DEFAULT 'Johannesburg',
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
            await context.Database.ExecuteSqlRawAsync(migrationSql);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Schema migration notice: {ex.Message}");
        }

        // 2. Seed Default Admin User if not exists
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
                    FullName = "DVT Movember Admin",
                    OfficeLocation = "Johannesburg",
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

        // 3. Seed Default Movember Quiz Arena if none exists
        try
        {
            var hasQuiz = await context.QuizGames.AnyAsync();
            if (!hasQuiz)
            {
                var quiz = new QuizGame
                {
                    Id = Guid.NewGuid(),
                    Title = "DVT Movember 2026 Grand Mustache Quiz Arena",
                    Status = "Lobby",
                    PinCode = "69420",
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
                        OptionA = "Magnum P.I. (Tom Selleck)", // Red Triangle - Correct
                        OptionB = "Sherlock Holmes",          // Blue Diamond
                        OptionC = "Lt. Columbo",               // Yellow Circle
                        OptionD = "Inspector Clouseau",       // Green Square
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
                        OptionB = "Men's mental health, prostate & testicular cancer awareness", // Blue - Correct
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
                        QuestionText = "In the DVT Mustache Judge rubric, what 3 dimensions determine your official score?",
                        OptionA = "Length, Curl & Bristle Shine",
                        OptionB = "Beard Ratio, Jawline & Smile",
                        OptionC = "Density, Symmetry & Swagger", // Yellow - Correct
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
                        OptionB = "Freddie Mercury", // Blue - Correct
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
                        QuestionText = "What is the official entry fee to feature your mustache on the public DVT Leaderboard for charity?",
                        OptionA = "Free",
                        OptionB = "R50",
                        OptionC = "R100", // Yellow - Correct
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
                        OptionD = "The Handlebar", // Green - Correct
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
                        OptionA = "A drawing, doodle, cartoon or non-human filter", // Red - Correct
                        OptionB = "A freshly groomed 10/10 handlebar",
                        OptionC = "An official DVT executive photo",
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
                        QuestionText = "Which DVT office is the undisputed reigning champion of facial hair swagger?",
                        OptionA = "Cape Town",
                        OptionB = "Johannesburg",
                        OptionC = "Amsterdam",
                        OptionD = "All 12 DVT Offices United!", // Green - Correct
                        CorrectOption = 3,
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
