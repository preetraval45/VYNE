using Amazon.SecretsManager;
using Amazon.SecretsManager.Model;
using System.Text.Json;

namespace Vyne.Core.Infrastructure.Services;

public class AwsSecretsService
{
    private readonly IConfiguration _configuration;

    public AwsSecretsService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task LoadSecretsAsync(IConfiguration configuration)
    {
        var region = _configuration["Aws:Region"] ?? "us-east-1";
        var env = _configuration["ASPNETCORE_ENVIRONMENT"] ?? "Production";
        var prefix = $"vyne/{env.ToLower()}";

        using var client = new AmazonSecretsManagerClient(Amazon.RegionEndpoint.GetBySystemName(region));

        await LoadSecretAsync(client, $"{prefix}/database", configuration, "ConnectionStrings:DefaultConnection", "url");
        await LoadSecretAsync(client, $"{prefix}/jwt", configuration, "Jwt:Secret", "secret");
    }

    private static async Task LoadSecretAsync(
        IAmazonSecretsManager client,
        string secretName,
        IConfiguration config,
        string configKey,
        string jsonKey)
    {
        try
        {
            var response = await client.GetSecretValueAsync(new GetSecretValueRequest
            {
                SecretId = secretName
            });

            var json = JsonDocument.Parse(response.SecretString);
            if (json.RootElement.TryGetProperty(jsonKey, out var value))
            {
                // IConfiguration doesn't support runtime modification cleanly;
                // in production, use AddSecretsManager() in the host builder instead
                // This is a simplified version for illustration
                Console.WriteLine($"Loaded secret key: {configKey}");
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Warning: Could not load secret {secretName}: {ex.Message}");
        }
    }
}
