using System.Text.Json;
using Amazon.EventBridge;
using Amazon.EventBridge.Model;

namespace Vyne.Projects.Infrastructure.Events;

public interface IEventPublisher
{
    Task PublishAsync(string detailType, object detail, CancellationToken ct = default);
}

public class EventBridgePublisher : IEventPublisher
{
    private const string EventBusName = "vyne-events";
    private const string EventSource = "vyne.projects-service";

    private readonly ILogger<EventBridgePublisher> _logger;
    private readonly IWebHostEnvironment _env;
    private readonly IAmazonEventBridge? _eventBridgeClient;

    public EventBridgePublisher(
        ILogger<EventBridgePublisher> logger,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _logger = logger;
        _env = env;

        if (!env.IsDevelopment())
        {
            var region = configuration["Aws:Region"] ?? "us-east-1";
            _eventBridgeClient = new AmazonEventBridgeClient(
                Amazon.RegionEndpoint.GetBySystemName(region));
        }
    }

    public async Task PublishAsync(string detailType, object detail, CancellationToken ct = default)
    {
        var detailJson = JsonSerializer.Serialize(detail, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });

        if (_env.IsDevelopment() || _eventBridgeClient is null)
        {
            _logger.LogInformation(
                "[EventBridge DEV] Bus={Bus} Source={Source} DetailType={DetailType} Detail={Detail}",
                EventBusName, EventSource, detailType, detailJson);
            return;
        }

        var request = new PutEventsRequest
        {
            Entries =
            [
                new PutEventsRequestEntry
                {
                    EventBusName = EventBusName,
                    Source = EventSource,
                    DetailType = detailType,
                    Detail = detailJson,
                    Time = DateTime.UtcNow
                }
            ]
        };

        try
        {
            var response = await _eventBridgeClient.PutEventsAsync(request, ct);

            if (response.FailedEntryCount > 0)
            {
                foreach (var entry in response.Entries.Where(e => e.ErrorCode is not null))
                {
                    _logger.LogError(
                        "EventBridge entry failed: ErrorCode={ErrorCode} ErrorMessage={ErrorMessage}",
                        entry.ErrorCode, entry.ErrorMessage);
                }
            }
            else
            {
                _logger.LogDebug(
                    "EventBridge event published: DetailType={DetailType}", detailType);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to publish EventBridge event: DetailType={DetailType}", detailType);
            throw;
        }
    }
}
