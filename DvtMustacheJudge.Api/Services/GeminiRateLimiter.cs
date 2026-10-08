namespace DvtMustacheJudge.Api.Services;

public interface IApiRateLimiter
{
    bool TryAcquire();
    Task AcquireAsync(CancellationToken cancellationToken = default);
    int GetRemainingRequests();
    TimeSpan GetTimeUntilNextWindow();
    int MaxRequestsPerMinute { get; }
    int QueuedRequestsCount { get; }
}

public class GeminiRateLimiter : IApiRateLimiter
{
    private class Waiter
    {
        public TaskCompletionSource<bool> Tcs { get; }
        public CancellationToken CancellationToken { get; }
        public CancellationTokenRegistration Registration { get; set; }

        public Waiter(TaskCompletionSource<bool> tcs, CancellationToken cancellationToken)
        {
            Tcs = tcs;
            CancellationToken = cancellationToken;
        }
    }

    private readonly int _maxRequestsPerMinute;
    private readonly TimeSpan _window;
    private readonly Queue<DateTime> _requestTimestamps = new();
    private readonly Queue<Waiter> _waitingQueue = new();
    private readonly object _lock = new();
    private readonly ILogger<GeminiRateLimiter> _logger;
    private Task? _processingTask;

    public int MaxRequestsPerMinute => _maxRequestsPerMinute;

    public int QueuedRequestsCount
    {
        get
        {
            lock (_lock)
            {
                return _waitingQueue.Count(w => !w.Tcs.Task.IsCompleted);
            }
        }
    }

    public GeminiRateLimiter(IConfiguration configuration, ILogger<GeminiRateLimiter> logger)
        : this(configuration, logger, TimeSpan.FromMinutes(1))
    {
    }

    public GeminiRateLimiter(IConfiguration configuration, ILogger<GeminiRateLimiter> logger, TimeSpan window)
    {
        _logger = logger;
        _window = window;

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

        _logger.LogInformation("GeminiRateLimiter initialized with limit of {Limit} requests per window ({WindowSeconds}s)", 
            _maxRequestsPerMinute, _window.TotalSeconds);
    }

    public bool TryAcquire()
    {
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            PurgeExpiredTimestampsLocked(now);

            // Only grant immediate permit if no other requests are queued ahead
            if (_waitingQueue.Count(w => !w.Tcs.Task.IsCompleted) == 0 && _requestTimestamps.Count < _maxRequestsPerMinute)
            {
                _requestTimestamps.Enqueue(now);
                _logger.LogInformation("Rate limit permit GRANTED immediately ({Current}/{Max} in the last {WindowSeconds}s)", 
                    _requestTimestamps.Count, _maxRequestsPerMinute, _window.TotalSeconds);
                return true;
            }

            _logger.LogWarning("Rate limit permit DENIED ({Current}/{Max} in the last {WindowSeconds}s, {Queued} queued). Throttling external Gemini call.", 
                _requestTimestamps.Count, _maxRequestsPerMinute, _window.TotalSeconds, QueuedRequestsCount);
            return false;
        }
    }

    public Task AcquireAsync(CancellationToken cancellationToken = default)
    {
        if (cancellationToken.IsCancellationRequested)
        {
            return Task.FromCanceled(cancellationToken);
        }

        lock (_lock)
        {
            var now = DateTime.UtcNow;
            PurgeExpiredTimestampsLocked(now);

            // Clean up any cancelled waiters at the front of the queue
            while (_waitingQueue.Count > 0 && _waitingQueue.Peek().Tcs.Task.IsCompleted)
            {
                var discarded = _waitingQueue.Dequeue();
                discarded.Registration.Dispose();
            }

            // If queue is empty and quota is available, grant permit immediately
            if (_waitingQueue.Count == 0 && _requestTimestamps.Count < _maxRequestsPerMinute)
            {
                _requestTimestamps.Enqueue(now);
                _logger.LogInformation("Rate limit permit GRANTED immediately ({Current}/{Max} in the last {WindowSeconds}s)", 
                    _requestTimestamps.Count, _maxRequestsPerMinute, _window.TotalSeconds);
                return Task.CompletedTask;
            }

            // Window is full or other requests are ahead in the queue: enqueue into waiting queue
            var tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
            var waiter = new Waiter(tcs, cancellationToken);

            if (cancellationToken.CanBeCanceled)
            {
                waiter.Registration = cancellationToken.Register(() =>
                {
                    lock (_lock)
                    {
                        waiter.Tcs.TrySetCanceled(cancellationToken);
                    }
                });
            }

            _waitingQueue.Enqueue(waiter);
            var queueDepth = _waitingQueue.Count(w => !w.Tcs.Task.IsCompleted);
            _logger.LogInformation("Request queued waiting for rate limit window to open. Current queue depth: {QueueDepth} ({Current}/{Max} permits used)",
                queueDepth, _requestTimestamps.Count, _maxRequestsPerMinute);

            EnsureQueueProcessorRunningLocked();

            return tcs.Task;
        }
    }

    private void EnsureQueueProcessorRunningLocked()
    {
        if (_processingTask == null || _processingTask.IsCompleted)
        {
            _processingTask = Task.Run(ProcessQueueAsync);
        }
    }

    private async Task ProcessQueueAsync()
    {
        while (true)
        {
            Waiter? waiterToGrant = null;
            TimeSpan delayNeeded = TimeSpan.Zero;

            lock (_lock)
            {
                var now = DateTime.UtcNow;
                PurgeExpiredTimestampsLocked(now);

                // Discard any cancelled or completed waiters
                while (_waitingQueue.Count > 0 && _waitingQueue.Peek().Tcs.Task.IsCompleted)
                {
                    var discarded = _waitingQueue.Dequeue();
                    discarded.Registration.Dispose();
                }

                if (_waitingQueue.Count == 0)
                {
                    _processingTask = null;
                    return;
                }

                if (_requestTimestamps.Count < _maxRequestsPerMinute)
                {
                    waiterToGrant = _waitingQueue.Dequeue();
                    _requestTimestamps.Enqueue(now);
                    var remaining = _waitingQueue.Count(w => !w.Tcs.Task.IsCompleted);
                    _logger.LogInformation("Rate limit window OPENED: Dequeued request. (Remaining in queue: {Remaining}, {Current}/{Max} permits used)",
                        remaining, _requestTimestamps.Count, _maxRequestsPerMinute);
                }
                else
                {
                    // Rate limit window is full: compute wait time until the oldest request in the window expires
                    var oldest = _requestTimestamps.Peek();
                    var timeUntilExpiry = (oldest + _window) - now;
                    // Add small 20ms buffer to ensure timestamp has strictly expired when waking up
                    delayNeeded = timeUntilExpiry > TimeSpan.Zero
                        ? timeUntilExpiry + TimeSpan.FromMilliseconds(20)
                        : TimeSpan.FromMilliseconds(50);
                }
            }

            if (waiterToGrant != null)
            {
                waiterToGrant.Registration.Dispose();
                waiterToGrant.Tcs.TrySetResult(true);
                // Continue immediately to check if more waiting requests can be granted
                continue;
            }

            if (delayNeeded > TimeSpan.Zero)
            {
                _logger.LogInformation("Rate limiter waiting {Seconds:F1}s for window to open. Queue depth: {QueueDepth}",
                    delayNeeded.TotalSeconds, QueuedRequestsCount);
                await Task.Delay(delayNeeded);
            }
        }
    }

    private void PurgeExpiredTimestampsLocked(DateTime now)
    {
        var cutoff = now - _window;
        while (_requestTimestamps.Count > 0 && _requestTimestamps.Peek() < cutoff)
        {
            _requestTimestamps.Dequeue();
        }
    }

    public int GetRemainingRequests()
    {
        lock (_lock)
        {
            PurgeExpiredTimestampsLocked(DateTime.UtcNow);
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
