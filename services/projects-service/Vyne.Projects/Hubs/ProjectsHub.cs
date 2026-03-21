using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Domain.Projects;

namespace Vyne.Projects.Hubs;

[Authorize]
public class ProjectsHub : Hub
{
    private readonly ILogger<ProjectsHub> _logger;

    public ProjectsHub(ILogger<ProjectsHub> logger)
    {
        _logger = logger;
    }

    // ── Group management ────────────────────────────────────────────────────

    /// <summary>Subscribe to real-time updates for a project.</summary>
    public async Task JoinProject(string projectId)
    {
        var groupName = GroupName(projectId);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogDebug("Connection {ConnectionId} joined group {Group}.",
            Context.ConnectionId, groupName);
    }

    /// <summary>Unsubscribe from real-time updates for a project.</summary>
    public async Task LeaveProject(string projectId)
    {
        var groupName = GroupName(projectId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogDebug("Connection {ConnectionId} left group {Group}.",
            Context.ConnectionId, groupName);
    }

    // ── Lifecycle ───────────────────────────────────────────────────────────

    public override async Task OnConnectedAsync()
    {
        _logger.LogDebug("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (exception is not null)
            _logger.LogWarning(exception, "Client disconnected with error: {ConnectionId}", Context.ConnectionId);
        else
            _logger.LogDebug("Client disconnected: {ConnectionId}", Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    public static string GroupName(string projectId) => $"project:{projectId}";
}

// ── Client method names (typed constants to avoid magic strings) ─────────────

public static class ProjectsHubEvents
{
    public const string IssueUpdated = "IssueUpdated";
    public const string IssueCreated = "IssueCreated";
    public const string IssueDeleted = "IssueDeleted";
    public const string SprintUpdated = "SprintUpdated";
    public const string ProjectUpdated = "ProjectUpdated";
}
