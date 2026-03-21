using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Hubs;
using Vyne.Projects.Infrastructure.Data;
using Vyne.Projects.Infrastructure.Events;
using Vyne.Projects.Infrastructure.Repositories;
using Vyne.Projects.Infrastructure.Services;

namespace Vyne.Projects.Controllers;

[Authorize]
public class IssuesController : ApiControllerBase
{
    private readonly IIssueRepository _issues;
    private readonly IProjectRepository _projects;
    private readonly IEventPublisher _events;
    private readonly IHubContext<ProjectsHub> _hub;
    private readonly ITenantContext _tenant;
    private readonly ILogger<IssuesController> _logger;

    public IssuesController(
        IIssueRepository issues,
        IProjectRepository projects,
        IEventPublisher events,
        IHubContext<ProjectsHub> hub,
        ITenantContext tenant,
        ILogger<IssuesController> logger)
    {
        _issues   = issues;
        _projects = projects;
        _events   = events;
        _hub      = hub;
        _tenant   = tenant;
        _logger   = logger;
    }

    // ── GET /projects/{projectId}/issues ─────────────────────────────────────

    [HttpGet("projects/{projectId:guid}/issues")]
    public async Task<IActionResult> List(
        Guid projectId,
        [FromQuery] IssueListQuery query,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null || project.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Project '{projectId}' not found."));

        var filters = new IssueFilters(
            ProjectId:  projectId,
            Status:     query.Status,
            Priority:   query.Priority,
            AssigneeId: query.AssigneeId,
            LabelId:    query.LabelId,
            SprintId:   query.SprintId,
            Q:          query.Q,
            SortBy:     query.SortBy,
            SortDir:    query.SortDir,
            Page:       Math.Max(1, query.Page),
            Limit:      Math.Clamp(query.Limit, 1, 200));

        var result = await _issues.ListAsync(filters, ct);
        return Ok(result);
    }

    // ── POST /projects/{projectId}/issues ────────────────────────────────────

    [HttpPost("projects/{projectId:guid}/issues")]
    public async Task<IActionResult> Create(
        Guid projectId,
        [FromBody] CreateIssueRequest body,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        if (string.IsNullOrWhiteSpace(body.Title))
            return BadRequest(ErrorBody(ErrValidation, "Issue title is required."));

        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null || project.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Project '{projectId}' not found."));

        var identifier = await _issues.NextIdentifierAsync(projectId, project.Identifier, ct);
        var position   = await _issues.NextPositionAsync(projectId, ct);
        var status     = ParseEnum(body.Status,   IssueStatus.Backlog);
        var priority   = ParseEnum(body.Priority, IssuePriority.Medium);

        var issue = Issue.Create(
            orgId:      orgId,
            projectId:  projectId,
            identifier: identifier,
            title:      body.Title,
            reporterId: userId,
            status:     status,
            priority:   priority,
            position:   position);

        issue.Update(
            description:   body.Description,
            assigneeId:    body.AssigneeId,
            sprintId:      body.SprintId,
            parentIssueId: body.ParentIssueId,
            dueDate:       body.DueDate,
            estimate:      body.Estimate);

        var created = await _issues.CreateAsync(issue, ct);

        var activity = IssueActivity.Create(orgId, created.Id, userId, ActivityType.Created);
        await _issues.AddActivityAsync(activity, ct);

        IssueEmbeddingWorker.Enqueue(created.Id);

        await _hub.Clients
            .Group(ProjectsHub.GroupName(projectId.ToString()))
            .SendAsync(ProjectsHubEvents.IssueCreated, created, ct);

        _logger.LogInformation("Issue created: {IssueId} Identifier={Identifier}", created.Id, identifier);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // ── GET /issues/{id} ─────────────────────────────────────────────────────

    [HttpGet("issues/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var issue = await _issues.GetByIdAsync(id, ct);

        if (issue is null || issue.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Issue '{id}' not found."));

        return Ok(issue);
    }

    // ── PATCH /issues/{id} ───────────────────────────────────────────────────

    [HttpPatch("issues/{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateIssueRequest body,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        var issue = await _issues.GetByIdAsync(id, ct);

        if (issue is null || issue.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Issue '{id}' not found."));

        var prev = new IssuePreviousState(issue);

        IssueStatus?   newStatus   = body.Status   is not null ? ParseEnum(body.Status,   issue.Status)   : null;
        IssuePriority? newPriority = body.Priority is not null ? ParseEnum(body.Priority, issue.Priority) : null;

        issue.Update(
            title:         body.Title,
            description:   body.Description,
            status:        newStatus,
            priority:      newPriority,
            assigneeId:    body.AssigneeId,
            clearAssignee: body.ClearAssignee,
            sprintId:      body.SprintId,
            clearSprint:   body.ClearSprint,
            parentIssueId: body.ParentIssueId,
            dueDate:       body.DueDate,
            estimate:      body.Estimate);

        var updated = await _issues.UpdateAsync(issue, ct);

        foreach (var a in BuildActivities(orgId, id, userId, prev, updated))
            await _issues.AddActivityAsync(a, ct);

        if (prev.Status != updated.Status)
            await PublishStatusChangedAsync(updated, prev.Status, userId, ct);

        if (body.Title is not null || body.Description is not null)
            IssueEmbeddingWorker.Enqueue(id);

        await _hub.Clients
            .Group(ProjectsHub.GroupName(updated.ProjectId.ToString()))
            .SendAsync(ProjectsHubEvents.IssueUpdated, updated, ct);

        return Ok(updated);
    }

    // ── DELETE /issues/{id} ──────────────────────────────────────────────────

    [HttpDelete("issues/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var issue = await _issues.GetByIdAsync(id, ct);

        if (issue is null || issue.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Issue '{id}' not found."));

        issue.SoftDelete();
        await _issues.UpdateAsync(issue, ct);

        await _hub.Clients
            .Group(ProjectsHub.GroupName(issue.ProjectId.ToString()))
            .SendAsync(ProjectsHubEvents.IssueDeleted, id, ct);

        _logger.LogInformation("Issue soft-deleted: {IssueId}", id);

        return NoContent();
    }

    // ── PATCH /issues/{id}/status ────────────────────────────────────────────

    [HttpPatch("issues/{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateIssueStatusRequest body,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        if (string.IsNullOrWhiteSpace(body.Status))
            return BadRequest(ErrorBody(ErrValidation, "Status is required."));

        if (!Enum.TryParse<IssueStatus>(body.Status, ignoreCase: true, out var newStatus))
            return BadRequest(ErrorBody(ErrValidation,
                $"Invalid status '{body.Status}'. Valid values: {string.Join(", ", Enum.GetNames<IssueStatus>())}"));

        var issue = await _issues.GetByIdAsync(id, ct);

        if (issue is null || issue.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Issue '{id}' not found."));

        var prevStatus = issue.Status;

        if (prevStatus == newStatus)
            return Ok(issue);

        issue.Update(status: newStatus);
        var updated = await _issues.UpdateAsync(issue, ct);

        var activity = IssueActivity.Create(
            orgId, id, userId,
            ActivityType.StatusChanged,
            fromValue: prevStatus.ToString(),
            toValue:   newStatus.ToString());

        await _issues.AddActivityAsync(activity, ct);
        await PublishStatusChangedAsync(updated, prevStatus, userId, ct);

        await _hub.Clients
            .Group(ProjectsHub.GroupName(updated.ProjectId.ToString()))
            .SendAsync(ProjectsHubEvents.IssueUpdated, updated, ct);

        return Ok(updated);
    }

    // ── PATCH /issues/reorder ────────────────────────────────────────────────

    [HttpPatch("issues/reorder")]
    public async Task<IActionResult> Reorder(
        [FromBody] ReorderIssuesRequest body,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out _))
            return TenantError();

        if (body.Updates is null || body.Updates.Count == 0)
            return BadRequest(ErrorBody(ErrValidation, "Updates array must not be empty."));

        var updates = body.Updates
            .Select(u => (u.Id, u.Position))
            .ToList();

        await _issues.ReorderAsync(updates, ct);

        return NoContent();
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private static TEnum ParseEnum<TEnum>(string? value, TEnum fallback) where TEnum : struct, Enum =>
        Enum.TryParse<TEnum>(value, ignoreCase: true, out var result) ? result : fallback;

    private async Task PublishStatusChangedAsync(
        Issue issue, IssueStatus fromStatus, Guid changedBy, CancellationToken ct)
    {
        await _events.PublishAsync("issue_status_changed", new
        {
            issueId    = issue.Id,
            orgId      = issue.OrgId,
            projectId  = issue.ProjectId,
            identifier = issue.Identifier,
            fromStatus = fromStatus.ToString(),
            toStatus   = issue.Status.ToString(),
            changedBy,
            changedAt  = DateTime.UtcNow
        }, ct);
    }

    private static List<IssueActivity> BuildActivities(
        Guid orgId, Guid issueId, Guid userId,
        IssuePreviousState prev, Issue updated)
    {
        var activities = new List<IssueActivity>();

        if (updated.Title != prev.Title)
            activities.Add(IssueActivity.Create(orgId, issueId, userId,
                ActivityType.TitleChanged, prev.Title, updated.Title));

        if (updated.Description != prev.Description)
            activities.Add(IssueActivity.Create(orgId, issueId, userId,
                ActivityType.DescriptionChanged, prev.Description, updated.Description));

        if (updated.Status != prev.Status)
            activities.Add(IssueActivity.Create(orgId, issueId, userId,
                ActivityType.StatusChanged, prev.Status.ToString(), updated.Status.ToString()));

        if (updated.Priority != prev.Priority)
            activities.Add(IssueActivity.Create(orgId, issueId, userId,
                ActivityType.PriorityChanged, prev.Priority.ToString(), updated.Priority.ToString()));

        if (updated.AssigneeId != prev.AssigneeId)
            activities.Add(IssueActivity.Create(orgId, issueId, userId,
                ActivityType.AssigneeChanged, prev.AssigneeId?.ToString(), updated.AssigneeId?.ToString()));

        if (updated.SprintId != prev.SprintId)
            activities.Add(IssueActivity.Create(orgId, issueId, userId,
                ActivityType.SprintChanged, prev.SprintId?.ToString(), updated.SprintId?.ToString()));

        return activities;
    }
}

// ── Value type that captures an issue's mutable fields before mutation ────────

public readonly struct IssuePreviousState
{
    public string        Title       { get; }
    public string?       Description { get; }
    public IssueStatus   Status      { get; }
    public IssuePriority Priority    { get; }
    public Guid?         AssigneeId  { get; }
    public Guid?         SprintId    { get; }

    public IssuePreviousState(Issue issue)
    {
        Title       = issue.Title;
        Description = issue.Description;
        Status      = issue.Status;
        Priority    = issue.Priority;
        AssigneeId  = issue.AssigneeId;
        SprintId    = issue.SprintId;
    }
}

// ── Query object for list endpoint (replaces 9 individual [FromQuery] params) ─

public class IssueListQuery
{
    public string? Status     { get; set; }
    public string? Priority   { get; set; }
    public Guid?   AssigneeId { get; set; }
    public Guid?   LabelId    { get; set; }
    public Guid?   SprintId   { get; set; }
    public string? Q          { get; set; }
    public string  SortBy     { get; set; } = "position";
    public string  SortDir    { get; set; } = "asc";
    public int     Page       { get; set; } = 1;
    public int     Limit      { get; set; } = 50;
}

// ── Request / response DTOs ───────────────────────────────────────────────────

public record CreateIssueRequest(
    string    Title,
    string?   Description,
    string?   Status,
    string?   Priority,
    Guid?     AssigneeId,
    Guid?     SprintId,
    Guid?     ParentIssueId,
    DateTime? DueDate,
    int?      Estimate);

public record UpdateIssueRequest(
    string?   Title,
    string?   Description,
    string?   Status,
    string?   Priority,
    Guid?     AssigneeId,
    bool      ClearAssignee,
    Guid?     SprintId,
    bool      ClearSprint,
    Guid?     ParentIssueId,
    DateTime? DueDate,
    int?      Estimate);

public record UpdateIssueStatusRequest(string Status);

public record ReorderItem(Guid Id, decimal Position);

public record ReorderIssuesRequest(List<ReorderItem> Updates);
