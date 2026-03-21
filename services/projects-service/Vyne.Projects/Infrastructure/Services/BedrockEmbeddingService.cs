using System.Text.Json;
using Amazon.BedrockRuntime;
using Amazon.BedrockRuntime.Model;

namespace Vyne.Projects.Infrastructure.Services;

public interface IBedrockEmbeddingService
{
    Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default);
}

public class BedrockEmbeddingService : IBedrockEmbeddingService
{
    private const string ModelId = "amazon.titan-embed-text-v2:0";
    private const int EmbeddingDimension = 1536;

    private readonly ILogger<BedrockEmbeddingService> _logger;
    private readonly IWebHostEnvironment _env;
    private readonly IAmazonBedrockRuntime? _bedrockClient;

    public BedrockEmbeddingService(
        ILogger<BedrockEmbeddingService> logger,
        IWebHostEnvironment env,
        IConfiguration configuration)
    {
        _logger = logger;
        _env = env;

        var region = configuration["Aws:Region"];

        if (!env.IsDevelopment() && !string.IsNullOrEmpty(region))
        {
            _bedrockClient = new AmazonBedrockRuntimeClient(
                Amazon.RegionEndpoint.GetBySystemName(region));
        }
        else if (!string.IsNullOrEmpty(region))
        {
            // In development, still try to initialise but gracefully fall back
            try
            {
                _bedrockClient = new AmazonBedrockRuntimeClient(
                    Amazon.RegionEndpoint.GetBySystemName(region));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "Could not initialise Bedrock client in development. Using mock embeddings.");
            }
        }
    }

    public async Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default)
    {
        if (_bedrockClient is null)
        {
            _logger.LogDebug("Bedrock not configured — returning mock zero embedding.");
            return new float[EmbeddingDimension];
        }

        var requestBody = JsonSerializer.Serialize(new { inputText = text });

        var invokeRequest = new InvokeModelRequest
        {
            ModelId = ModelId,
            ContentType = "application/json",
            Accept = "application/json",
            Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(requestBody))
        };

        try
        {
            var response = await _bedrockClient.InvokeModelAsync(invokeRequest, ct);

            using var reader = new StreamReader(response.Body);
            var responseBody = await reader.ReadToEndAsync(ct);

            using var document = JsonDocument.Parse(responseBody);

            var embeddingArray = document.RootElement
                .GetProperty("embedding")
                .EnumerateArray()
                .Select(e => e.GetSingle())
                .ToArray();

            _logger.LogDebug(
                "Bedrock embedding retrieved: dimension={Dimension}", embeddingArray.Length);

            return embeddingArray;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to get Bedrock embedding for text (length={Length}). Returning zeros.",
                text.Length);

            // Gracefully degrade rather than failing the caller
            return new float[EmbeddingDimension];
        }
    }
}
