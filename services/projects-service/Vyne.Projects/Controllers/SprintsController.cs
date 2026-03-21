using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Hubs;
using Vyne.Projects.Infrastructure.Data;
using Vyne.Projects.Infrastructure.Repositories;

namespace Vyne.Projects.Controllers;

[Authorize]
public class SprintsController : ApiControllerBase
{
    private readonly ISprintRepository _sprints;
    private readonly IProjectRepository _projects;
    private readonly IIssueRepository _issues;
    private readonly IHubContext<ProjectsHub> _hub;
    private readonly ITenantContext _tenant;
    private readonly ILogger<SprintsController> _logger;

    public SprintsController(
        ISprintRepository sprints,
        IProjectRepository projects,
        IIssueRepository issues,
        IHubContext<ProjectsHub> hub,
        ITenantContext tenant,
        ILogger<SprintsController> logger)
    {
        _sprints  = sprints;
        _projects = projects;
        _issues   = issues;
        _hub      = hub;
        _tenant   = tenant;
        _logger   = logger;
    }

    // ── GET /projects/{projectId}/sprints ────────────────────────────────────

    [HttpGet("projects/{projectId:guid}/sprints")]
    public async Task<IActionResult> List(Guid projectId, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null || project.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Project '{projectId}' not found."));

        var sprintList = await _sprints.ListByProjectAsync(projectId, ct);
        return Ok(sprintList);
    }

    // ── POST /projects/{projectId}/sprints ───────────────────────────────────

    [HttpPost("projects/{projectId:guid}/sprints")]
    public async Task<IActionResult> Create(
        Guid projectId,
        [FromBody] CreateSprintRequest body,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(ErrorBody(ErrValidation, "Sprint name is required."));

        var project = await _projects.GetByIdAsync(projectId, ct);
        if (project is null || project.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Project '{projectId}' not found."));

        var sprint = Sprint.Create(
            orgId:     orgId,
            projectId: projectId,
            name:      body.Name,
            startDate: body.StartDate,
            endDate:   body.EndDate,
            goal:      body.Goal);

        var created = await _sprints.CreateAsync(sprint, ct);

        _logger.LogInformation("Sprint created: {SprintId} Project={ProjectId}", created.Id, projectId);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // ── GET /sprints/{id} (used only for CreatedAtAction routing) ────────────

    [HttpGet("sprints/{id:guid}", Name = "GetSprintById")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var sprint = await _sprints.GetByIdAsync(id, ct);

        if (sprint is null || sprint.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Sprint '{id}' not found."));

        return Ok(sprint);
    }

    // ── PATCH /sprints/{id}/start ────────────────────────────────────────────

    [HttpPatch("sprints/{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var sprint = await _sprints.GetByIdAsync(id, ct);

        if (sprint is null || sprint.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Sprint '{id}' not found."));

        try
        {
            sprint.Start();
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(ErrorBody(ErrInvalidState, ex.Message));
        }

        var updated = await _sprints.UpdateAsync(sprint, ct);

        await _hub.Clients
            .Group(ProjectsHub.GroupName(sprint.ProjectId.ToString()))
            .SendAsync(ProjectsHubEvents.SprintUpdated, updated, ct);

        _logger.LogInformation("Sprint started: {SprintId}", id);

        return Ok(updated);
    }

    // ── PATCH /sprints/{id}/close ────────────────────────────────────────────

    [HttpPatch("sprints/{id:guid}/close")]
    public async Task<IActionResult> Close(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var sprint = await _sprints.GetByIdAsync(id, ct);

        if (sprint is null || sprint.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Sprint '{id}' not found."));

        try
        {
            sprint.Complete();
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(ErrorBody(ErrInvalidState, ex.Message));
        }

        var updated = await _sprints.UpdateAsync(sprint, ct);

        // Move incomplete issues to backlog (sprintId = null)
        var incomplete = await _sprints.GetIncompleteIssuesAsync(id, ct);

        foreach (var issue in incomplete)
        {
            issue.Update(clearSprint: true);
            await _issues.UpdateAsync(issue, ct);
        }

        _logger.LogInformation(
            "Sprint closed: {SprintId}. Moved {Count} incomplete issues to backlog.",
            id, incomplete.Count);

        await _hub.Clients
            .Group(ProjectsHub.GroupName(sprint.ProjectId.ToString()))
            .SendAsync(ProjectsHubEvents.SprintUpdated, updated, ct);

        return Ok(new { sprint = updated, issuesMovedToBacklog = incomplete.Count });
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────

public record CreateSprintRequest(
    string    Name,
    DateOnly? StartDate,
    DateOnly? EndDate,
    string?   Goal);
