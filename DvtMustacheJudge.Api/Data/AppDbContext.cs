using DvtMustacheJudge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DvtMustacheJudge.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<MustacheEntry> MustacheEntries => Set<MustacheEntry>();
    public DbSet<User> Users => Set<User>();
    public DbSet<QuizGame> QuizGames => Set<QuizGame>();
    public DbSet<QuizQuestion> QuizQuestions => Set<QuizQuestion>();
    public DbSet<QuizPlayer> QuizPlayers => Set<QuizPlayer>();
    public DbSet<QuizPlayerAnswer> QuizPlayerAnswers => Set<QuizPlayerAnswer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<MustacheEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OverallScore);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.StyleCategory);
            entity.HasIndex(e => e.IsHidden);
            entity.HasIndex(e => e.UserId);

            entity.HasOne(e => e.User)
                  .WithMany(u => u.Entries)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.LeaderboardPaid);
            entity.HasIndex(u => u.QuizPaid);
        });

        modelBuilder.Entity<QuizGame>(entity =>
        {
            entity.HasKey(g => g.Id);
            entity.HasIndex(g => g.Status);
            entity.HasIndex(g => g.PinCode);

            entity.HasMany(g => g.Questions)
                  .WithOne()
                  .HasForeignKey(q => q.QuizGameId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(g => g.Players)
                  .WithOne()
                  .HasForeignKey(p => p.QuizGameId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizQuestion>(entity =>
        {
            entity.HasKey(q => q.Id);
            entity.HasIndex(q => new { q.QuizGameId, q.QuestionOrder });
        });

        modelBuilder.Entity<QuizPlayer>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => p.QuizGameId);
            entity.HasIndex(p => p.TotalScore);

            entity.HasMany(p => p.Answers)
                  .WithOne()
                  .HasForeignKey(a => a.QuizPlayerId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizPlayerAnswer>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.HasIndex(a => new { a.QuizPlayerId, a.QuizQuestionId });
        });
    }
}
