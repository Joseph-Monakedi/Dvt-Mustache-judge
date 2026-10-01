using DvtMustacheJudge.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace DvtMustacheJudge.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context)
    {
        // 1. Ensure primary table exists
        try
        {
            var databaseCreator = (RelationalDatabaseCreator)context.Database.GetService<IDatabaseCreator>();
            await databaseCreator.CreateTablesAsync();
        }
        catch
        {
            // Table already exists
        }

        // 2. Automatically update / migrate Supabase PostgreSQL schema with new columns if missing
        try
        {
            var migrationSql = @"
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""IsWoodenSpoon"" boolean NOT NULL DEFAULT false;
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""WoodenSpoonReason"" character varying(100);
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""InnovationScore"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""DedicationScore"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""MustacheEntries"" ADD COLUMN IF NOT EXISTS ""FunninessScore"" integer NOT NULL DEFAULT 0;
            ";
            await context.Database.ExecuteSqlRawAsync(migrationSql);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Schema migration notice: {ex.Message}");
        }

        // 3. One-time classification for existing entries:
        // Identify any existing cartoons, drawings, or pen doodles and move them to the Wooden Spoon division
        try
        {
            var existingEntries = await context.MustacheEntries.ToListAsync();
            bool modified = false;
            foreach (var entry in existingEntries)
            {
                var nameLower = (entry.ContestantName ?? "").ToLowerInvariant();
                var roastLower = (entry.RoastCommentary ?? "").ToLowerInvariant();
                var titleLower = (entry.MustacheTitle ?? "").ToLowerInvariant();

                bool isCartoonOrFake = nameLower.Contains("mickey") || 
                                       nameLower.Contains("cartoon") || 
                                       roastLower.Contains("cartoon") || 
                                       roastLower.Contains("animated") || 
                                       roastLower.Contains("ballpoint") || 
                                       roastLower.Contains("ink") || 
                                       roastLower.Contains("doodle") ||
                                       titleLower.Contains("2d") ||
                                       titleLower.Contains("paper");

                if (isCartoonOrFake && !entry.IsWoodenSpoon)
                {
                    entry.IsWoodenSpoon = true;
                    entry.WoodenSpoonReason = (nameLower.Contains("mickey") || roastLower.Contains("animated") || roastLower.Contains("cartoon"))
                        ? "Cartoon / Drawing"
                        : "Marker Pen / Doodle";
                    entry.InnovationScore = Math.Clamp(entry.DensityScore > 0 ? entry.DensityScore : 8, 1, 10);
                    entry.DedicationScore = Math.Clamp(entry.SymmetryScore > 0 ? entry.SymmetryScore : 8, 1, 10);
                    entry.FunninessScore = 10;
                    entry.OverallScore = Math.Clamp((entry.InnovationScore * 3) + (entry.DedicationScore * 3) + (entry.FunninessScore * 4), 1, 100);
                    entry.VerdictBadge = entry.WoodenSpoonReason == "Cartoon / Drawing" 
                        ? "Cartoon Bristle Legend" 
                        : "Marker Pen Maestro";
                    modified = true;
                }
            }

            if (modified)
            {
                await context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Classification notice: {ex.Message}");
        }

        // Note: As specified, NO mock seed data is added on initialization.
    }
}
