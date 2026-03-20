using Amazon.EventBridge;
using Amazon.EventBridge.Model;
using System.Text.Json;

namespace Vyne.Core.Infrastructure.Events;

public interface IEventPublisher
{
    Task PublishAsync<T>(string eventType, string source, T data, CancellationToken ct = default) where T : class;
}

public class EventBridgePublisher : IEventPublisher
{
    private readonly IAmazonEventBridge _eventBridge;
    private readonly IConfiguration _config;
    private readonly ILogger<EventBridgePublisher> _logger;

    public EventBridgePublisher(
        IAmazonEventBridge eventBridge,
        IConfiguration config,
        ILogger<EventBridgePublisher> logger)
    {
        _eventBridge = eventBridge;
        _config = config;
        _logger = logger;
    }

    private string BusName => _config["EventBridge:BusName"] ?? "vyne-events";

    public async Task PublishAsync<T>(string eventType, string source, T data, CancellationToken ct = default)
        where T : class
    {
        var payload = JsonSerializer.Serialize(new
        {
            specversion = "1.0",
            id = Guid.NewGuid().ToString(),
            source,
            type = eventType,
            datacontenttype = "application/json",
            time = DateTime.UtcNow.ToString("O"),
            data
        });

        var request = new PutEventsRequest
        {
            Entries =
            [
                new PutEventsRequestEntry
                {
                    EventBusName = BusName,
                    Source = source,
                    DetailType = eventType,
                    Detail = payload,
                    Time = DateTime.UtcNow
                }
            ]
        };

        try
        {
            var response = await _eventBridge.PutEventsAsync(request, ct);
            if (response.FailedEntryCount > 0)
            {
                _logger.LogError(
                    "Failed to publish event {EventType}. Failed entries: {Count}",
                    eventType, response.FailedEntryCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish event {EventType} to EventBridge", eventType);
            // Don't rethrow — event publishing is best-effort; don't break the request
        }
    }
}
