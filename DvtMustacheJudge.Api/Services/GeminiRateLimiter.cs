namespace DvtMustacheJudge.Api.Services;

public interface IApiRateLimiter
{
    bool TryAcquire();
    int GetRemainingRequests();
    TimeSpan GetTimeUntilNextWindow();
}

public class GeminiRateLimiter : IApiRateLimiter
{
    private readonly int _maxRequestsPerMinute;
    private readonly TimeSpan _window = TimeSpan.FromMinutes(1);
    private readonly Queue<DateTime> _requestTimestamps = new();
    private readonly object _lock = new();
    private readonly ILogger<GeminiRateLimiter> _logger;

    public GeminiRateLimiter(IConfiguration configuration, ILogger<GeminiRateLimiter> logger)
    {
        _logger = logger;
        // Default: strictly 3 requests per minute for free Gemini tier
        _maxRequestsPerMinute = configuration.GetValue<int>("Gemini:MaxRequestsPerMinute", 3);
        _logger.LogInformation("GeminiRateLimiter initialized with limit of {Limit} requests per minute", _maxRequestsPerMinute);
    }

    public bool TryAcquire()
    {
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            var cutoff = now - _window;

            // Remove timestamps older than 60 seconds
            while (_requestTimestamps.Count > 0 && _requestTimestamps.Peek() < cutoff)
            {
                _requestTimestamps.Dequeue();
            }

            if (_requestTimestamps.Count < _maxRequestsPerMinute)
            {
                _requestTimestamps.Enqueue(now);
                _logger.LogInformation("Rate limit permit GRANTED ({Current}/{Max} in the last 60s)", 
                    _requestTimestamps.Count, _maxRequestsPerMinute);
                return true;
            }

            _logger.LogWarning("Rate limit permit DENIED ({Current}/{Max} in the last 60s). Throttling external Gemini call.", 
                _requestTimestamps.Count, _maxRequestsPerMinute);
            return false;
        }
    }

    public int GetRemainingRequests()
    {
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            var cutoff = now - _window;
            while (_requestTimestamps.Count > 0 && _requestTimestamps.Peek() < cutoff)
            {
                _requestTimestamps.Dequeue();
            }
            return Math.Max(0, _maxRequestsPerMinute - _requestTimestamps.Count);
        }
    }

    public TimeSpan GetTimeUntilNextWindow()
    {
        lock (_lock)
        {
            if (_requestTimestamps.Count == 0) return TimeSpan.Zero;
            var oldest = _requestTimestamps.Peek();
            var remaining = (oldest + _window) - DateTime.UtcNow;
            return remaining > TimeSpan.Zero ? remaining : TimeSpan.Zero;
        }
    }
}
