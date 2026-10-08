using DvtMustacheJudge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DvtMustacheJudge.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<MustacheEntry> MustacheEntries => Set<MustacheEntry>();

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
        });
    }
}
