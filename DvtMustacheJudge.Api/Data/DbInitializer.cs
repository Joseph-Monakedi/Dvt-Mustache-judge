using DvtMustacheJudge.Api.Models;
using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

namespace DvtMustacheJudge.Api.Data;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context)
    {
        try
        {
            var databaseCreator = (RelationalDatabaseCreator)context.Database.GetService<IDatabaseCreator>();
            await databaseCreator.CreateTablesAsync();
        }
        catch
        {
            // Ignore if tables already exist
        }

        if (await context.MustacheEntries.AnyAsync())
        {
            return; // Already seeded
        }

        var seeds = new List<MustacheEntry>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Thabo M.",
                OfficeLocation = "Johannesburg",
                ImageUrl = "/mock-avatars/thabo.svg",
                ThumbnailUrl = "/mock-avatars/thabo.svg",
                OverallScore = 96,
                DensityScore = 10,
                SymmetryScore = 9,
                SwaggerScore = 10,
                MustacheTitle = "The Bristle Sovereign",
                StyleCategory = "Chevron",
                RoastCommentary = "A formidable architectural masterpiece. Foliage so dense it absorbs sound waves and commands instantaneous respect in code reviews.",
                CelebrityTwin = "88% Tom Selleck, 10% Ron Swanson, 2% Espresso",
                VerdictBadge = "Grand Champion",
                CreatedAt = DateTime.UtcNow.AddHours(-1),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Francois v.d.M.",
                OfficeLocation = "Cape Town",
                ImageUrl = "/mock-avatars/francois.svg",
                ThumbnailUrl = "/mock-avatars/francois.svg",
                OverallScore = 94,
                DensityScore = 8,
                SymmetryScore = 10,
                SwaggerScore = 9,
                MustacheTitle = "The Handlebar Inquisitor",
                StyleCategory = "Handlebar",
                RoastCommentary = "Waxed tips engineered with sub-millimeter precision. A mustache with enough lateral wingspan to achieve lift during high-velocity sprint planning.",
                CelebrityTwin = "82% Hercule Poirot, 15% Salvador Dalí, 3% Stache Wax",
                VerdictBadge = "Certified DVT Heavyweight",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Liam D.",
                OfficeLocation = "Durban",
                ImageUrl = "/mock-avatars/liam.svg",
                ThumbnailUrl = "/mock-avatars/liam.svg",
                OverallScore = 92,
                DensityScore = 9,
                SymmetryScore = 9,
                SwaggerScore = 9,
                MustacheTitle = "The Aristocratic Velocity",
                StyleCategory = "Painter's Brush",
                RoastCommentary = "Clean horizontal sweep across the upper lip. Deflects incoming production bugs before they even touch the staging branch.",
                CelebrityTwin = "76% Burt Reynolds, 19% Freddie Mercury, 5% Pure Grit",
                VerdictBadge = "Aerodynamic Vanguard",
                CreatedAt = DateTime.UtcNow.AddHours(-3),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Sipho K.",
                OfficeLocation = "Gqeberha",
                ImageUrl = "/mock-avatars/sipho.svg",
                ThumbnailUrl = "/mock-avatars/sipho.svg",
                OverallScore = 89,
                DensityScore = 9,
                SymmetryScore = 8,
                SwaggerScore = 9,
                MustacheTitle = "The Walrus Titan",
                StyleCategory = "Walrus",
                RoastCommentary = "Majestic downward cascade that completely conceals the upper lip. A true heavyweight champion of winter bristle conservation.",
                CelebrityTwin = "84% Mark Twain, 12% Sam Elliott, 4% Polar Bear Fur",
                VerdictBadge = "Walrus Supreme",
                CreatedAt = DateTime.UtcNow.AddHours(-4),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Johan B.",
                OfficeLocation = "London",
                ImageUrl = "/mock-avatars/johan.svg",
                ThumbnailUrl = "/mock-avatars/johan.svg",
                OverallScore = 88,
                DensityScore = 8,
                SymmetryScore = 9,
                SwaggerScore = 8,
                MustacheTitle = "The Horseshoe Outlaw",
                StyleCategory = "Horseshoe",
                RoastCommentary = "Vertical runners extending proudly toward the jawline. Gives off undeniable 'I deploy on Friday afternoon without fear' energy.",
                CelebrityTwin = "79% Hulk Hogan, 16% Stone Cold, 5% Iron Ore",
                VerdictBadge = "Ironclad Outlaw",
                CreatedAt = DateTime.UtcNow.AddHours(-5),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Sarah Q.",
                OfficeLocation = "Waterford",
                ImageUrl = "/mock-avatars/sarah.svg",
                ThumbnailUrl = "/mock-avatars/sarah.svg",
                OverallScore = 87,
                DensityScore = 8,
                SymmetryScore = 8,
                SwaggerScore = 10,
                MustacheTitle = "The Prop Propeller",
                StyleCategory = "Handlebar",
                RoastCommentary = "An honorary theatrical mustache worn with sheer unadulterated charisma. Maximum swagger points awarded by unanimous judicial decree!",
                CelebrityTwin = "65% Charlie Chaplin, 30% Steampunk Aviator, 5% Glitter",
                VerdictBadge = "Honorary Swagger Ace",
                CreatedAt = DateTime.UtcNow.AddHours(-6),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Kyle W.",
                OfficeLocation = "Amsterdam",
                ImageUrl = "/mock-avatars/kyle.svg",
                ThumbnailUrl = "/mock-avatars/kyle.svg",
                OverallScore = 85,
                DensityScore = 7,
                SymmetryScore = 9,
                SwaggerScore = 8,
                MustacheTitle = "The Pencil Precisionist",
                StyleCategory = "Pencil",
                RoastCommentary = "A delicate 1.2 millimeter razor line that demands steady breathing and a surgeon's touch. Sleek, vintage, and dangerously suave.",
                CelebrityTwin = "81% Errol Flynn, 14% Prince, 5% Laser Cutter",
                VerdictBadge = "Micro-Engineered Aristocrat",
                CreatedAt = DateTime.UtcNow.AddHours(-7),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Naledi T.",
                OfficeLocation = "Johannesburg",
                ImageUrl = "/mock-avatars/naledi.svg",
                ThumbnailUrl = "/mock-avatars/naledi.svg",
                OverallScore = 84,
                DensityScore = 8,
                SymmetryScore = 8,
                SwaggerScore = 8,
                MustacheTitle = "The Stubbled Maverick",
                StyleCategory = "Stubbled Maverick",
                RoastCommentary = "A calculated 3-day stubble boundary with effortless symmetry. Casual enough for a hackathon, polished enough for an executive demo.",
                CelebrityTwin = "70% George Clooney, 24% Pedro Pascal, 6% Cold Brew",
                VerdictBadge = "The Strategic Underdog",
                CreatedAt = DateTime.UtcNow.AddHours(-8),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Pieter P.",
                OfficeLocation = "Baar",
                ImageUrl = "/mock-avatars/pieter.svg",
                ThumbnailUrl = "/mock-avatars/pieter.svg",
                OverallScore = 82,
                DensityScore = 7,
                SymmetryScore = 8,
                SwaggerScore = 8,
                MustacheTitle = "The Chevron Contender",
                StyleCategory = "Chevron",
                RoastCommentary = "Thick, solid, and reliable. Like a well-maintained Kubernetes cluster, it does its job day and night without complaining.",
                CelebrityTwin = "74% Nick Offerman, 20% Mike Ditka, 6% Biltong Spice",
                VerdictBadge = "Cluster Guardian",
                CreatedAt = DateTime.UtcNow.AddHours(-9),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Devon S.",
                OfficeLocation = "Durban",
                ImageUrl = "/mock-avatars/devon.svg",
                ThumbnailUrl = "/mock-avatars/devon.svg",
                OverallScore = 80,
                DensityScore = 7,
                SymmetryScore = 7,
                SwaggerScore = 9,
                MustacheTitle = "The Coastal Handlebar",
                StyleCategory = "Handlebar",
                RoastCommentary = "Surfing the high winds of Durban with slightly windswept curl tips. Brings high energy and salty ocean breeze to daily standup.",
                CelebrityTwin = "68% Kelly Slater with a Stache, 27% David Crosby, 5% Surf Wax",
                VerdictBadge = "Coastal Cruiser",
                CreatedAt = DateTime.UtcNow.AddHours(-10),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Tariq E.",
                OfficeLocation = "Nairobi",
                ImageUrl = "/mock-avatars/tariq.svg",
                ThumbnailUrl = "/mock-avatars/tariq.svg",
                OverallScore = 78,
                DensityScore = 7,
                SymmetryScore = 8,
                SwaggerScore = 7,
                MustacheTitle = "The Painter's Apprentice",
                StyleCategory = "Painter's Brush",
                RoastCommentary = "Even distribution along the lip with soft feathered edges. A classic artisan stache that paints a picture of determination.",
                CelebrityTwin = "72% Bob Ross, 22% Walter White, 6% Bristle Acrylic",
                VerdictBadge = "Artisan Creator",
                CreatedAt = DateTime.UtcNow.AddHours(-11),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Chen W.",
                OfficeLocation = "Dubai",
                ImageUrl = "/mock-avatars/chen.svg",
                ThumbnailUrl = "/mock-avatars/chen.svg",
                OverallScore = 76,
                DensityScore = 6,
                SymmetryScore = 8,
                SwaggerScore = 7,
                MustacheTitle = "The Minimalist Thread",
                StyleCategory = "Pencil",
                RoastCommentary = "Zero fluff, minimal latency, highly optimized. This mustache represents clean code principles applied to facial grooming.",
                CelebrityTwin = "75% John Waters, 18% Clark Gable, 7% High-Purity Fiber",
                VerdictBadge = "Clean Code Connoisseur",
                CreatedAt = DateTime.UtcNow.AddHours(-12),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Kabelo Z.",
                OfficeLocation = "West Perth",
                ImageUrl = "/mock-avatars/kabelo.svg",
                ThumbnailUrl = "/mock-avatars/kabelo.svg",
                OverallScore = 73,
                DensityScore = 6,
                SymmetryScore = 7,
                SwaggerScore = 8,
                MustacheTitle = "The Sprouting Pioneer",
                StyleCategory = "Peach Fuzz",
                RoastCommentary = "Rome wasn't built in a day, and neither is a Tom Selleck chevron. True courage on display, fighting for follicle glory!",
                CelebrityTwin = "62% Michael Cera, 31% Early-Stage Seedling, 7% Tenacity",
                VerdictBadge = "Peach Fuzz Pioneer",
                CreatedAt = DateTime.UtcNow.AddHours(-13),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Marcus V.",
                OfficeLocation = "REMOTE",
                ImageUrl = "/mock-avatars/marcus.svg",
                ThumbnailUrl = "/mock-avatars/marcus.svg",
                OverallScore = 71,
                DensityScore = 5,
                SymmetryScore = 7,
                SwaggerScore = 7,
                MustacheTitle = "The Shadow Scout",
                StyleCategory = "Stubbled Maverick",
                RoastCommentary = "Undercover stealth bristles. You don't always see them coming, but they are steadily gaining critical mass by Movember 30th.",
                CelebrityTwin = "66% Keanu Reeves, 26% Shadow Warrior, 8% Morning Roast",
                VerdictBadge = "Stealth Operative",
                CreatedAt = DateTime.UtcNow.AddHours(-14),
                IsHidden = false
            },
            new()
            {
                Id = Guid.NewGuid(),
                ContestantName = "Andre N.",
                OfficeLocation = "Cape Town",
                ImageUrl = "/mock-avatars/andre.svg",
                ThumbnailUrl = "/mock-avatars/andre.svg",
                OverallScore = 68,
                DensityScore = 5,
                SymmetryScore = 6,
                SwaggerScore = 8,
                MustacheTitle = "The Hopeful Whiskers",
                StyleCategory = "Peach Fuzz",
                RoastCommentary = "Delicate golden filaments whispering promises of future grandeur. Heart of a lion, foliage of an early spring blossom.",
                CelebrityTwin = "59% Young Justin Bieber, 33% Sunflower Seedling, 8% Unshakable Optimism",
                VerdictBadge = "Heart of Gold",
                CreatedAt = DateTime.UtcNow.AddHours(-15),
                IsHidden = false
            }
        };

        await context.MustacheEntries.AddRangeAsync(seeds);
        await context.SaveChangesAsync();
    }
}
