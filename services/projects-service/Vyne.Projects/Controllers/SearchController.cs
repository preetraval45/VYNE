using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Vyne.Projects.Infrastructure.Data;
using Vyne.Projects.Infrastructure.Repositories;

namespace Vyne.Projects.Controllers;

[Authorize]
[Route("search")]
public class SearchController : ApiControllerBase
{
    private readonly IIssueRepository _issues;
    private readonly ITenantContext _tenant;
    private readonly ILogger<SearchController> _logger;

    public SearchController(
        IIssueRepository issues,
        ITenantContext tenant,
        ILogger<SearchController> logger)
    {
        _issues = issues;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /search/issues?q={query}&limit={limit} ───────────────────────────

    [HttpGet("issues")]
    public async Task<IActionResult> SearchIssues(
        [FromQuery] string? q,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        if (!TryGetOrgId(_tenant, out var orgId))
            return TenantError();

        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(ErrorBody(ErrValidation, "Query parameter 'q' is required."));

        limit = Math.Clamp(limit, 1, 100);

        _logger.LogDebug("Issue search: OrgId={OrgId} Query={Query} Limit={Limit}", orgId, q, limit);

        var results = await _issues.SearchAsync(orgId, q, limit, ct);

        return Ok(new
        {
            query  = q,
            limit,
            total  = results.Count,
            items  = results
        });
    }
}
