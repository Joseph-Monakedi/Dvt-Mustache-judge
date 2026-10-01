namespace DvtMustacheJudge.Api.Services;

public interface IImageStorageService
{
    Task<(string ImageUrl, string ThumbnailUrl)> UploadImageAsync(Stream stream, string fileName, string contentType);
    Task<bool> DeleteImageAsync(string imageUrl);
}
