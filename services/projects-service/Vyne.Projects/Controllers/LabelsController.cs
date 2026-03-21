using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Infrastructure.Data;
using Vyne.Projects.Infrastructure.Repositories;

namespace Vyne.Projects.Controllers;

[Authorize]
public class LabelsController : ApiControllerBase
{
    private readonly ILabelRepository _labels;
    private readonly IIssueRepository _issues;
    private readonly ITenantContext _tenant;
    private readonly ILogger<LabelsController> _logger;

    public LabelsController(
        ILabelRepository labels,
        IIssueRepository issues,
        ITenantContext tenant,
        ILogger<LabelsController> logger)
    {
        _labels = labels;
        _issues = issues;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /labels ──────────────────────────────────────────────────────────

    [HttpGet("labels")]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var labelList = await _labels.ListByOrgAsync(orgId, ct);
        return Ok(labelList);
    }

    // ── POST /labels ─────────────────────────────────────────────────────────

    [HttpPost("labels")]
    public async Task<IActionResult> Create(
        [FromBody] CreateLabelRequest body,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(ErrorBody(ErrValidation, "Label name is required."));

        var label = Label.Create(orgId, body.Name, body.Color ?? "#6C47FF");

        try
        {
            var created = await _labels.CreateAsync(label, ct);
            _logger.LogInformation("Label created: {LabelId} Name={Name}", created.Id, created.Name);
            return CreatedAtAction(nameof(List), created);
        }
        catch (Exception ex) when (
            ex.Message.Contains("unique", StringComparison.OrdinalIgnoreCase) ||
            ex.InnerException?.Message.Contains("unique", StringComparison.OrdinalIgnoreCase) == true)
        {
            return Conflict(ErrorBody(ErrLabelConflict,
                $"A label named '{body.Name}' already exists in this organisation."));
        }
    }

    // ── POST /issues/{issueId}/labels/{labelId} ──────────────────────────────

    [HttpPost("issues/{issueId:guid}/labels/{labelId:guid}")]
    public async Task<IActionResult> AddToIssue(
        Guid issueId,
        Guid labelId,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        var issue = await _issues.GetByIdAsync(issueId, ct);
        if (issue is null || issue.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Issue '{issueId}' not found."));

        var label = await _labels.GetByIdAsync(labelId, ct);
        if (label is null || label.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Label '{labelId}' not found."));

        await _labels.AddToIssueAsync(issueId, labelId, ct);

        var activity = IssueActivity.Create(
            orgId, issueId, userId,
            ActivityType.LabelAdded,
            toValue: label.Name);

        await _issues.AddActivityAsync(activity, ct);

        return Ok(new { issueId, labelId });
    }

    // ── DELETE /issues/{issueId}/labels/{labelId} ────────────────────────────

    [HttpDelete("issues/{issueId:guid}/labels/{labelId:guid}")]
    public async Task<IActionResult> RemoveFromIssue(
        Guid issueId,
        Guid labelId,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        var issue = await _issues.GetByIdAsync(issueId, ct);
        if (issue is null || issue.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Issue '{issueId}' not found."));

        var label = await _labels.GetByIdAsync(labelId, ct);
        if (label is null || label.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Label '{labelId}' not found."));

        await _labels.RemoveFromIssueAsync(issueId, labelId, ct);

        var activity = IssueActivity.Create(
            orgId, issueId, userId,
            ActivityType.LabelRemoved,
            fromValue: label.Name);

        await _issues.AddActivityAsync(activity, ct);

        return NoContent();
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────

public record CreateLabelRequest(string Name, string? Color);
