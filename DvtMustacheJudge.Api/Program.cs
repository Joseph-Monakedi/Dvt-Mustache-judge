using DvtMustacheJudge.Api.Data;
using DvtMustacheJudge.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Add services
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHttpContextAccessor();

// 2. Database configuration: strictly Supabase PostgreSQL (no local alternative)
var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                          ?? builder.Configuration["SUPABASE_CONNECTION_STRING"]
                          ?? builder.Configuration["SUPABASE_DB_URL"]
                          ?? Environment.GetEnvironmentVariable("SUPABASE_CONNECTION_STRING")
                          ?? Environment.GetEnvironmentVariable("SUPABASE_DB_URL")
                          ?? "Host=aws-0-eu-central-1.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true";

var npgsqlConnectionString = ParseSupabaseConnectionString(rawConnectionString);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(npgsqlConnectionString);
});

// 3. Storage services (Cloudinary with Local disk fallback)
builder.Services.AddScoped<LocalStorageService>();
builder.Services.AddScoped<IImageStorageService, CloudinaryStorageService>();

// 4. Content Moderation Service for contestant name and text
builder.Services.AddSingleton<IContentModerationService, ContentModerationService>();

// 5. Rate Limiter (strictly max 3 requests per minute for free Gemini tier)
builder.Services.AddSingleton<IApiRateLimiter, GeminiRateLimiter>();

// 5. Gemini AI Judge HTTP Client
builder.Services.AddHttpClient<IGeminiJudgeService, GeminiJudgeService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

// 6. CORS policy for React Vite dev server and mobile testing
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowViteClient", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();

        // Also allow local LAN/dev origins
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Auto-seed Supabase database and ensure schema created
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<AppDbContext>();
        await DbInitializer.SeedAsync(db);
        app.Logger.LogInformation("Supabase PostgreSQL database initialized and verified.");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "An error occurred connecting to, initializing, or seeding the Supabase database: {Message}", ex.Message);
    }
}

// 7. Middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowViteClient");

// Serve wwwroot for local uploads and mock avatars
app.UseStaticFiles();

app.MapControllers();

app.Run();

// Helper to convert standard postgresql:// URI format into Npgsql connection string if provided
static string ParseSupabaseConnectionString(string connection)
{
    if (string.IsNullOrWhiteSpace(connection))
    {
        return connection;
    }

    if (connection.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        connection.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        try
        {
            var uri = new Uri(connection);
            var userInfo = uri.UserInfo.Split(':');
            var user = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "postgres";
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 5432;
            var database = uri.AbsolutePath.TrimStart('/');
            if (string.IsNullOrWhiteSpace(database)) database = "postgres";

            return $"Host={host};Port={port};Database={database};Username={user};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
        }
        catch
        {
            return connection;
        }
    }

    return connection;
}

public partial class Program { }
