using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vyne.Projects.Domain.Docs;
using Vyne.Projects.Infrastructure.Data;
using Vyne.Projects.Infrastructure.Repositories;

namespace Vyne.Projects.Controllers;

[Authorize]
[Route("docs")]
public class DocsController : ApiControllerBase
{
    private readonly IDocumentRepository _docs;
    private readonly ITenantContext _tenant;
    private readonly ILogger<DocsController> _logger;

    public DocsController(
        IDocumentRepository docs,
        ITenantContext tenant,
        ILogger<DocsController> logger)
    {
        _docs   = docs;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /docs ─────────────────────────────────────────────────────────────
    // List root documents for org (parent_id IS NULL)

    [HttpGet]
    public async Task<IActionResult> ListRoot(CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var docs = await _docs.ListRootAsync(orgId, ct);
        return Ok(docs.Select(MapToResponse));
    }

    // ── GET /docs/{id}/children ───────────────────────────────────────────────

    [HttpGet("{id:guid}/children")]
    public async Task<IActionResult> ListChildren(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var parent = await _docs.GetByIdAsync(id, ct);
        if (parent is null || parent.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Document '{id}' not found."));

        var children = await _docs.ListChildrenAsync(orgId, id, ct);
        return Ok(children.Select(MapToResponse));
    }

    // ── POST /docs ────────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDocRequest body, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        if (string.IsNullOrWhiteSpace(body.Title))
            body = body with { Title = "Untitled" };

        // Validate parent exists in same org if specified
        if (body.ParentId.HasValue)
        {
            var parent = await _docs.GetByIdAsync(body.ParentId.Value, ct);
            if (parent is null || parent.OrgId != orgId)
                return NotFound(ErrorBody(ErrNotFound, $"Parent document '{body.ParentId}' not found."));
        }

        var doc = Document.Create(orgId, userId, body.Title, body.ParentId, body.Icon);
        var created = await _docs.CreateAsync(doc, ct);

        // Optionally save initial content version
        if (!string.IsNullOrWhiteSpace(body.Content))
        {
            var version = DocumentVersion.Create(created.Id, body.Content, 1, userId);
            await _docs.AddVersionAsync(version, ct);
            created.SetContent(body.Content);
        }

        _logger.LogInformation("Document created: {DocId} OrgId={OrgId}", created.Id, orgId);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, MapToResponse(created));
    }

    // ── GET /docs/{id} ────────────────────────────────────────────────────────

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var doc = await _docs.GetByIdWithContentAsync(id, ct);
        if (doc is null || doc.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Document '{id}' not found."));

        return Ok(MapToResponse(doc));
    }

    // ── PATCH /docs/{id} ─────────────────────────────────────────────────────

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDocRequest body, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        var doc = await _docs.GetByIdAsync(id, ct);
        if (doc is null || doc.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Document '{id}' not found."));

        doc.Update(title: body.Title, icon: body.Icon, coverUrl: body.CoverUrl, updatedBy: userId);

        var updated = await _docs.UpdateAsync(doc, ct);

        // If content provided, save a new version
        if (body.Content is not null)
        {
            var nextVersion = await _docs.GetNextVersionAsync(id, ct);
            var version     = DocumentVersion.Create(id, body.Content, nextVersion, userId);
            await _docs.AddVersionAsync(version, ct);
            updated.SetContent(body.Content);
        }
        else
        {
            // Re-load latest content for the response
            var withContent = await _docs.GetByIdWithContentAsync(id, ct);
            if (withContent is not null)
                updated.SetContent(withContent.Content);
        }

        return Ok(MapToResponse(updated));
    }

    // ── DELETE /docs/{id} ────────────────────────────────────────────────────

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        var doc = await _docs.GetByIdAsync(id, ct);
        if (doc is null || doc.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Document '{id}' not found."));

        if (doc.IsDeleted)
            return Ok(MapToResponse(doc)); // idempotent

        doc.SoftDelete();
        await _docs.UpdateAsync(doc, ct);

        _logger.LogInformation("Document soft-deleted: {DocId}", id);
        return Ok(new { deleted = true, id });
    }

    // ── POST /docs/{id}/duplicate ─────────────────────────────────────────────

    [HttpPost("{id:guid}/duplicate")]
    public async Task<IActionResult> Duplicate(Guid id, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (!TryGetUserId(_tenant, out var userId))
            return UserError();

        var source = await _docs.GetByIdWithContentAsync(id, ct);
        if (source is null || source.OrgId != orgId)
            return NotFound(ErrorBody(ErrNotFound, $"Document '{id}' not found."));

        var copy = Document.Create(
            orgId,
            userId,
            $"{source.Title} (Copy)",
            source.ParentId,
            source.Icon);

        var created = await _docs.CreateAsync(copy, ct);

        if (!string.IsNullOrWhiteSpace(source.Content))
        {
            var version = DocumentVersion.Create(created.Id, source.Content, 1, userId);
            await _docs.AddVersionAsync(version, ct);
            created.SetContent(source.Content);
        }

        _logger.LogInformation("Document duplicated: {SourceId} -> {CopyId}", id, created.Id);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, MapToResponse(created));
    }

    // ── GET /docs/search?q={query} ────────────────────────────────────────────

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, CancellationToken ct)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(ErrorBody(ErrValidation, "Query parameter 'q' is required."));

        var results = await _docs.SearchAsync(orgId, q, limit: 50, ct);
        return Ok(results.Select(MapToResponse));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static object MapToResponse(Document d) => new
    {
        d.Id,
        d.OrgId,
        d.ParentId,
        d.Title,
        d.Icon,
        d.CoverUrl,
        d.IsPublished,
        d.IsTemplate,
        d.CreatedBy,
        d.UpdatedBy,
        d.Position,
        d.CreatedAt,
        d.UpdatedAt,
        d.Content,
    };
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record CreateDocRequest(
    string Title = "Untitled",
    Guid? ParentId = null,
    string? Icon = null,
    string? Content = null);

public record UpdateDocRequest(
    string? Title = null,
    string? Icon = null,
    string? CoverUrl = null,
    string? Content = null);
