namespace DvtMustacheJudge.Api.Services;

public interface IApiRateLimiter
{
    bool TryAcquire();
    int GetRemainingRequests();
    TimeSpan GetTimeUntilNextWindow();
    int MaxRequestsPerMinute { get; }
}

public class GeminiRateLimiter : IApiRateLimiter
{
    private readonly int _maxRequestsPerMinute;
    private readonly TimeSpan _window = TimeSpan.FromMinutes(1);
    private readonly Queue<DateTime> _requestTimestamps = new();
    private readonly object _lock = new();
    private readonly ILogger<GeminiRateLimiter> _logger;

    public int MaxRequestsPerMinute => _maxRequestsPerMinute;

    public GeminiRateLimiter(IConfiguration configuration, ILogger<GeminiRateLimiter> logger)
    {
        _logger = logger;
        
        // Priority:
        // 1. Environment variables: GEMINI_MAX_REQUESTS_PER_MINUTE or Gemini__MaxRequestsPerMinute
        // 2. IConfiguration ["Gemini:MaxRequestsPerMinute"]
        // 3. Fallback default: 3
        var envVar = Environment.GetEnvironmentVariable("GEMINI_MAX_REQUESTS_PER_MINUTE") 
                     ?? Environment.GetEnvironmentVariable("Gemini__MaxRequestsPerMinute");

        if (!string.IsNullOrWhiteSpace(envVar) && int.TryParse(envVar, out var envLimit) && envLimit > 0)
        {
            _maxRequestsPerMinute = envLimit;
        }
        else
        {
            _maxRequestsPerMinute = configuration.GetValue<int>("Gemini:MaxRequestsPerMinute", 3);
        }

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
