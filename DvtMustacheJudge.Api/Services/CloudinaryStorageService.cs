using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace DvtMustacheJudge.Api.Services;

public class CloudinaryStorageService : IImageStorageService
{
    private readonly Cloudinary? _cloudinary;
    private readonly LocalStorageService _fallbackStorage;
    private readonly ILogger<CloudinaryStorageService> _logger;
    private readonly bool _isConfigured;

    public CloudinaryStorageService(
        IConfiguration configuration,
        LocalStorageService fallbackStorage,
        ILogger<CloudinaryStorageService> logger)
    {
        _fallbackStorage = fallbackStorage;
        _logger = logger;

        var cloudName = configuration["Cloudinary:CloudName"];
        var apiKey = configuration["Cloudinary:ApiKey"];
        var apiSecret = configuration["Cloudinary:ApiSecret"];

        if (!string.IsNullOrWhiteSpace(cloudName) &&
            !cloudName.Contains("YOUR_") &&
            !string.IsNullOrWhiteSpace(apiKey) &&
            !apiKey.Contains("YOUR_") &&
            !string.IsNullOrWhiteSpace(apiSecret) &&
            !apiSecret.Contains("YOUR_"))
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
            _isConfigured = true;
            _logger.LogInformation("Cloudinary storage initialized for cloud: {CloudName}", cloudName);
        }
        else
        {
            _isConfigured = false;
            _logger.LogInformation("Cloudinary credentials not configured or using placeholders. Using LocalStorageService fallback.");
        }
    }

    public async Task<(string ImageUrl, string ThumbnailUrl)> UploadImageAsync(Stream stream, string fileName, string contentType)
    {
        byte[] bytes;
        if (stream.CanSeek)
        {
            stream.Position = 0;
        }
        using (var ms = new MemoryStream())
        {
            await stream.CopyToAsync(ms);
            bytes = ms.ToArray();
        }

        if (!_isConfigured || _cloudinary == null)
        {
            using var localMs = new MemoryStream(bytes);
            return await _fallbackStorage.UploadImageAsync(localMs, fileName, contentType);
        }

        try
        {
            using var uploadStream = new MemoryStream(bytes);
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(fileName, uploadStream),
                Folder = "dvt-mustache-judge",
                PublicId = $"stache_{Guid.NewGuid():N}",
                Transformation = new Transformation().Quality("auto").FetchFormat("auto")
            };

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                _logger.LogWarning("Cloudinary upload failed: {Error}. Falling back to LocalStorage.", uploadResult.Error.Message);
                using var fallbackMs = new MemoryStream(bytes);
                return await _fallbackStorage.UploadImageAsync(fallbackMs, fileName, contentType);
            }

            var fullUrl = uploadResult.SecureUrl?.ToString() ?? uploadResult.Url?.ToString() ?? string.Empty;
            
            // Build face-crop thumbnail URL
            var thumbUrl = _cloudinary.Api.UrlImgUp
                .Transform(new Transformation().Width(200).Height(200).Crop("thumb").Gravity("face"))
                .BuildUrl(uploadResult.PublicId);

            _logger.LogInformation("Uploaded to Cloudinary: {Url}, Thumb: {Thumb}", fullUrl, thumbUrl);
            return (fullUrl, thumbUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception during Cloudinary upload. Falling back to local storage.");
            using var fallbackMs = new MemoryStream(bytes);
            return await _fallbackStorage.UploadImageAsync(fallbackMs, fileName, contentType);
        }
    }

    public async Task<bool> DeleteImageAsync(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return false;
        }

        if (!_isConfigured || _cloudinary == null || !imageUrl.Contains("cloudinary.com"))
        {
            return await _fallbackStorage.DeleteImageAsync(imageUrl);
        }

        try
        {
            string publicId = ExtractCloudinaryPublicId(imageUrl);
            if (!string.IsNullOrWhiteSpace(publicId))
            {
                var delParams = new DeletionParams(publicId);
                var delResult = await _cloudinary.DestroyAsync(delParams);
                _logger.LogInformation("Deleted Cloudinary image {PublicId}, result: {Result}", publicId, delResult.Result);
                return delResult.Result == "ok";
            }

            return await _fallbackStorage.DeleteImageAsync(imageUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting Cloudinary image: {ImageUrl}", imageUrl);
            return await _fallbackStorage.DeleteImageAsync(imageUrl);
        }
    }

    private static string ExtractCloudinaryPublicId(string url)
    {
        try
        {
            var uri = new Uri(url);
            var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            var folderIndex = Array.FindIndex(segments, s => s.Equals("dvt-mustache-judge", StringComparison.OrdinalIgnoreCase));
            if (folderIndex >= 0 && folderIndex < segments.Length - 1)
            {
                var filename = segments[folderIndex + 1];
                var nameWithoutExt = Path.GetFileNameWithoutExtension(filename);
                return $"dvt-mustache-judge/{nameWithoutExt}";
            }

            var lastSegment = segments.LastOrDefault();
            return !string.IsNullOrEmpty(lastSegment) ? Path.GetFileNameWithoutExtension(lastSegment) : string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }
}
