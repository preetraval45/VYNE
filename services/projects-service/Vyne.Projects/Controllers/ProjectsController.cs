using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Vyne.Projects.Domain.Projects;
using Vyne.Projects.Hubs;
using Vyne.Projects.Infrastructure.Data;
using Vyne.Projects.Infrastructure.Repositories;

namespace Vyne.Projects.Controllers;

[Authorize]
[Route("projects")]
public class ProjectsController : ApiControllerBase
{
    private readonly IProjectRepository _projects;
    private readonly IIssueRepository _issues;
    private readonly IHubContext<ProjectsHub> _hub;
    private readonly ITenantContext _tenant;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(
        IProjectRepository projects,
        IIssueRepository issues,
        IHubContext<ProjectsHub> hub,
        ITenantContext tenant,
        ILogger<ProjectsController> logger)
    {
        _projects = projects;
        _issues   = issues;
        _hub      = hub;
        _tenant   = tenant;
        _logger   = logger;
    }

    // ── GET /projects ────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var projectList = await _projects.ListAsync(orgId, ct);

        var result = new List<object>(projectList.Count);

        foreach (var project in projectList)
        {
            var filters   = new IssueFilters(project.Id, Limit: int.MaxValue);
            var allIssues = await _issues.ListAsync(filters, ct);

            var countsByStatus = allIssues.Items
                .GroupBy(i => i.Status.ToString())
                .ToDictionary(g => g.Key, g => g.Count());

            result.Add(new
            {
                project.Id,
                project.OrgId,
                project.Name,
                project.Description,
                project.Status,
                project.Identifier,
                project.Icon,
                project.Color,
                project.LeadId,
                project.Settings,
                project.CreatedAt,
                project.UpdatedAt,
                issueCounts = countsByStatus,
                totalIssues = allIssues.Total
            });
        }

        return Ok(result);
    }

    // ── POST /projects ───────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest body, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(ErrorBody(ErrValidation, "Project name is required."));

        var identifier = !string.IsNullOrWhiteSpace(body.Identifier)
            ? body.Identifier.ToUpperInvariant().Trim()
            : GenerateIdentifier(body.Name);

        if (identifier.Length is < 1 or > 20)
            return BadRequest(ErrorBody(ErrValidation, "Identifier must be between 1 and 20 characters."));

        if (await _projects.IdentifierExistsAsync(orgId, identifier, ct))
            return Conflict(ErrorBody(ErrConflict,
                $"An identifier '{identifier}' already exists in this organisation."));

        var project = Project.Create(orgId, body.Name, identifier, leadId: _tenant.UserId);

        project.Update(
            name: null,
            description: body.Description,
            icon: body.Icon,
            color: body.Color,
            leadId: null,
            status: null);

        var created = await _projects.CreateAsync(project, ct);

        _logger.LogInformation("Project created: {ProjectId} Identifier={Identifier}", created.Id, identifier);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // ── GET /projects/{id} ───────────────────────────────────────────────────

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var project = await _projects.GetByIdAsync(id, ct);

        if (project is null || project.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Project '{id}' not found."));

        return Ok(project);
    }

    // ── PATCH /projects/{id} ─────────────────────────────────────────────────

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectRequest body, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var project = await _projects.GetByIdAsync(id, ct);

        if (project is null || project.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Project '{id}' not found."));

        if (project.Status == ProjectStatus.Archived)
            return UnprocessableEntity(ErrorBody(ErrArchived, "Cannot update an archived project."));

        project.Update(
            name: body.Name,
            description: body.Description,
            icon: body.Icon,
            color: body.Color,
            leadId: body.LeadId,
            status: null);

        if (body.Settings is not null)
            project.UpdateSettings(body.Settings);

        var updated = await _projects.UpdateAsync(project, ct);

        await _hub.Clients
            .Group(ProjectsHub.GroupName(id.ToString()))
            .SendAsync(ProjectsHubEvents.ProjectUpdated, updated, ct);

        return Ok(updated);
    }

    // ── DELETE /projects/{id} ────────────────────────────────────────────────

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var project = await _projects.GetByIdAsync(id, ct);

        if (project is null || project.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Project '{id}' not found."));

        if (project.Status == ProjectStatus.Archived)
            return Ok(project); // idempotent

        project.Archive();
        var archived = await _projects.UpdateAsync(project, ct);

        _logger.LogInformation("Project archived: {ProjectId}", id);

        return Ok(archived);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static string GenerateIdentifier(string name)
    {
        var letters = name
            .Where(char.IsLetter)
            .Take(3)
            .Select(char.ToUpper)
            .ToArray();

        return letters.Length > 0 ? new string(letters) : "PRJ";
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────

public record CreateProjectRequest(
    string Name,
    string? Description,
    string? Icon,
    string? Color,
    string? Identifier);

public record UpdateProjectRequest(
    string? Name,
    string? Description,
    string? Icon,
    string? Color,
    Guid? LeadId,
    ProjectSettings? Settings);
