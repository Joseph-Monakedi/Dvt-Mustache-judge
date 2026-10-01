namespace DvtMustacheJudge.Api.Services;

public class LocalStorageService : IImageStorageService
{
    private readonly IWebHostEnvironment _environment;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<LocalStorageService> _logger;

    public LocalStorageService(
        IWebHostEnvironment environment,
        IHttpContextAccessor httpContextAccessor,
        ILogger<LocalStorageService> logger)
    {
        _environment = environment;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<(string ImageUrl, string ThumbnailUrl)> UploadImageAsync(Stream stream, string fileName, string contentType)
    {
        var webRoot = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(webRoot))
        {
            webRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var uploadsFolder = Path.Combine(webRoot, "uploads");
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrEmpty(extension))
        {
            extension = contentType switch
            {
                "image/png" => ".png",
                "image/webp" => ".webp",
                _ => ".jpg"
            };
        }

        var uniqueName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsFolder, uniqueName);

        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            if (stream.CanSeek)
            {
                stream.Position = 0;
            }
            await stream.CopyToAsync(fileStream);
        }

        var request = _httpContextAccessor.HttpContext?.Request;
        string baseUrl = request != null
            ? $"{request.Scheme}://{request.Host}"
            : "";

        var relativeUrl = $"/uploads/{uniqueName}";
        var fullUrl = string.IsNullOrEmpty(baseUrl) ? relativeUrl : $"{baseUrl}{relativeUrl}";

        _logger.LogInformation("Saved local image to {Path}, public URL: {Url}", filePath, fullUrl);

        return (fullUrl, fullUrl);
    }

    public Task<bool> DeleteImageAsync(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return Task.FromResult(false);
        }

        try
        {
            var webRoot = _environment.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRoot))
            {
                webRoot = Path.Combine(_environment.ContentRootPath, "wwwroot");
            }

            string fileName;
            if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri))
            {
                fileName = Path.GetFileName(uri.LocalPath);
            }
            else
            {
                fileName = Path.GetFileName(imageUrl);
            }

            if (string.IsNullOrWhiteSpace(fileName))
            {
                return Task.FromResult(false);
            }

            var filePath = Path.Combine(webRoot, "uploads", fileName);
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                _logger.LogInformation("Deleted local image file at {Path}", filePath);
                return Task.FromResult(true);
            }

            _logger.LogWarning("Local image file not found for deletion: {Path}", filePath);
            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting local image: {ImageUrl}", imageUrl);
            return Task.FromResult(false);
        }
    }
}
