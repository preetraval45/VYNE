using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Vyne.Core.Infrastructure.Data;
using Vyne.Core.Infrastructure.Repositories;

namespace Vyne.Core.Controllers;

[ApiController]
[Route("orgs")]
[Authorize]
public class OrganizationsController : ControllerBase
{
    private readonly IOrganizationRepository _orgRepo;
    private readonly ITenantContext _tenant;
    private readonly ILogger<OrganizationsController> _logger;

    public OrganizationsController(
        IOrganizationRepository orgRepo,
        ITenantContext tenant,
        ILogger<OrganizationsController> logger)
    {
        _orgRepo = orgRepo;
        _tenant = tenant;
        _logger = logger;
    }

    /// <summary>GET /orgs — Get current organization</summary>
    [HttpGet]
    public async Task<IActionResult> GetCurrentOrg(CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(new { error = new { code = "NO_TENANT", message = "No tenant context" } });

        var org = await _orgRepo.GetByIdAsync(_tenant.OrgId.Value, ct);
        if (org is null) return NotFound();

        return Ok(new { data = Map(org) });
    }

    /// <summary>GET /orgs/{id} — Get org by ID (must match tenant)</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId != id)
            return Forbid();

        var org = await _orgRepo.GetByIdAsync(id, ct);
        if (org is null) return NotFound();

        return Ok(new { data = Map(org) });
    }

    /// <summary>PATCH /orgs/{id} — Update organization</summary>
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateOrgRequest request, CancellationToken ct)
    {
        if (_tenant.OrgId != id)
            return Forbid();

        var org = await _orgRepo.GetByIdAsync(id, ct);
        if (org is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Name))
            org.UpdateName(request.Name);

        if (request.LogoUrl is not null)
            org.UpdateLogoUrl(request.LogoUrl);

        await _orgRepo.UpdateAsync(org, ct);

        return Ok(new { data = Map(org) });
    }

    private static object Map(Domain.Organizations.Organization org) => new
    {
        id = org.Id,
        name = org.Name,
        slug = org.Slug,
        logoUrl = org.LogoUrl,
        plan = org.Plan.ToString().ToLower(),
        maxMembers = org.MaxMembers,
        settings = org.Settings,
        createdAt = org.CreatedAt,
        updatedAt = org.UpdatedAt
    };
}

public record UpdateOrgRequest(
    string? Name,
    string? LogoUrl
);
