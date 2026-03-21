using System.Collections.Concurrent;
using Pgvector;
using Vyne.Projects.Infrastructure.Repositories;

namespace Vyne.Projects.Infrastructure.Services;

public sealed class IssueEmbeddingWorker : BackgroundService
{
    private static readonly ConcurrentQueue<Guid> _queue = new();

    private const int BatchSize = 10;
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<IssueEmbeddingWorker> _logger;

    public IssueEmbeddingWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<IssueEmbeddingWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    /// <summary>
    /// Enqueue an issue ID for embedding generation.
    /// </summary>
    public static void Enqueue(Guid issueId) => _queue.Enqueue(issueId);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("IssueEmbeddingWorker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(Interval, stoppingToken);
                await ProcessBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Normal shutdown — exit gracefully
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in IssueEmbeddingWorker loop.");
            }
        }

        _logger.LogInformation("IssueEmbeddingWorker stopped.");
    }

    private async Task ProcessBatchAsync(CancellationToken ct)
    {
        var batch = new List<Guid>(BatchSize);

        while (batch.Count < BatchSize && _queue.TryDequeue(out var id))
            batch.Add(id);

        if (batch.Count == 0)
            return;

        _logger.LogDebug("Processing embedding batch of {Count} issues.", batch.Count);

        await using var scope = _scopeFactory.CreateAsyncScope();
        var issueRepo = scope.ServiceProvider.GetRequiredService<IIssueRepository>();
        var embeddingService = scope.ServiceProvider.GetRequiredService<IBedrockEmbeddingService>();

        foreach (var issueId in batch)
        {
            try
            {
                var issue = await issueRepo.GetByIdAsync(issueId, ct);

                if (issue is null || issue.IsDeleted)
                {
                    _logger.LogDebug("Issue {IssueId} not found or deleted — skipping embedding.", issueId);
                    continue;
                }

                var text = string.IsNullOrWhiteSpace(issue.Description)
                    ? issue.Title
                    : $"{issue.Title}\n\n{issue.Description}";

                var embeddingFloats = await embeddingService.GetEmbeddingAsync(text, ct);
                var vector = new Vector(embeddingFloats);

                issue.SetEmbedding(vector);
                await issueRepo.UpdateAsync(issue, ct);

                _logger.LogDebug("Embedding updated for issue {IssueId}.", issueId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate embedding for issue {IssueId}.", issueId);
                // Do not re-enqueue to avoid infinite retry loop; caller can re-enqueue if needed
            }
        }
    }
}
