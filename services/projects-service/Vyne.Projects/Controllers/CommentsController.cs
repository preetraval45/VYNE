using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Infrastructure.Data;
using Vyne.Projects.Infrastructure.Repositories;

namespace Vyne.Projects.Controllers;

[Authorize]
public class CommentsController : ApiControllerBase
{
    private readonly ICommentRepository _comments;
    private readonly IIssueRepository _issues;
    private readonly ITenantContext _tenant;
    private readonly ILogger<CommentsController> _logger;

    public CommentsController(
        ICommentRepository comments,
        IIssueRepository issues,
        ITenantContext tenant,
        ILogger<CommentsController> logger)
    {
        _comments = comments;
        _issues   = issues;
        _tenant   = tenant;
        _logger   = logger;
    }

    // ── GET /issues/{issueId}/comments ───────────────────────────────────────

    [HttpGet("issues/{issueId:guid}/comments")]
    public async Task<IActionResult> List(Guid issueId, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var issue = await _issues.GetByIdAsync(issueId, ct);
        if (issue is null || issue.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Issue '{issueId}' not found."));

        var commentList = await _comments.ListByIssueAsync(issueId, ct);
        return Ok(commentList);
    }

    // ── POST /issues/{issueId}/comments ──────────────────────────────────────

    [HttpPost("issues/{issueId:guid}/comments")]
    public async Task<IActionResult> Create(
        Guid issueId,
        [FromBody] CreateCommentRequest body,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        if (string.IsNullOrWhiteSpace(body.Content))
            return BadRequest(ErrorBody(ErrValidation, "Comment content is required."));

        var issue = await _issues.GetByIdAsync(issueId, ct);
        if (issue is null || issue.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Issue '{issueId}' not found."));

        var comment = IssueComment.Create(orgId, issueId, userId, body.Content);
        var created = await _comments.CreateAsync(comment, ct);

        var activity = IssueActivity.Create(
            orgId, issueId, userId,
            ActivityType.CommentAdded,
            toValue: created.Id.ToString());

        await _issues.AddActivityAsync(activity, ct);

        _logger.LogInformation("Comment created: {CommentId} on Issue={IssueId}", created.Id, issueId);

        return CreatedAtAction(nameof(List), new { issueId }, created);
    }

    // ── PATCH /comments/{id} ─────────────────────────────────────────────────

    [HttpPatch("comments/{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCommentRequest body,
        CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        if (string.IsNullOrWhiteSpace(body.Content))
            return BadRequest(ErrorBody(ErrValidation, "Comment content is required."));

        var comment = await _comments.GetByIdAsync(id, ct);

        if (comment is null || comment.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Comment '{id}' not found."));

        if (comment.UserId != userId)
            return Forbid();

        comment.Edit(body.Content);
        var updated = await _comments.UpdateAsync(comment, ct);

        return Ok(updated);
    }

    // ── DELETE /comments/{id} ────────────────────────────────────────────────

    [HttpDelete("comments/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        var comment = await _comments.GetByIdAsync(id, ct);

        if (comment is null || comment.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Comment '{id}' not found."));

        if (comment.UserId != userId)
            return Forbid();

        comment.SoftDelete();
        await _comments.UpdateAsync(comment, ct);

        _logger.LogInformation("Comment soft-deleted: {CommentId} on Issue={IssueId}", id, comment.IssueId);

        return NoContent();
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────

public record CreateCommentRequest(string Content);

public record UpdateCommentRequest(string Content);
