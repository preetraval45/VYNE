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

    /// <summary>PATCH /orgs/{id} — Update organization name, logo, settings, and branding</summary>
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

        // Apply settings patch if provided
        if (request.Settings is not null)
        {
            var current = org.Settings;

            if (request.Settings.DefaultTimezone is not null)
                current.DefaultTimezone = request.Settings.DefaultTimezone;

            if (request.Settings.Currency is not null)
                current.Currency = request.Settings.Currency;

            if (request.Settings.FiscalYearStart is int fys)
                current.FiscalYearStart = fys;

            // Apply module feature flags
            if (request.Settings.Features is not null)
            {
                var f = current.Features;
                var req = request.Settings.Features;
                if (req.Chat.HasValue)          f.Chat          = req.Chat.Value;
                if (req.Projects.HasValue)      f.Projects      = req.Projects.Value;
                if (req.Docs.HasValue)          f.Docs          = req.Docs.Value;
                if (req.Ai.HasValue)            f.Ai            = req.Ai.Value;
                if (req.Erp.HasValue)           f.Erp           = req.Erp.Value;
                if (req.Finance.HasValue)       f.Finance       = req.Finance.Value;
                if (req.Crm.HasValue)           f.Crm           = req.Crm.Value;
                if (req.Sales.HasValue)         f.Sales         = req.Sales.Value;
                if (req.Invoicing.HasValue)     f.Invoicing     = req.Invoicing.Value;
                if (req.Manufacturing.HasValue) f.Manufacturing = req.Manufacturing.Value;
                if (req.Purchase.HasValue)      f.Purchase      = req.Purchase.Value;
                if (req.Hr.HasValue)            f.Hr            = req.Hr.Value;
                if (req.Marketing.HasValue)     f.Marketing     = req.Marketing.Value;
                if (req.Maintenance.HasValue)   f.Maintenance   = req.Maintenance.Value;
                if (req.Support.HasValue)       f.Support       = req.Support.Value;
                if (req.Observability.HasValue) f.Observability = req.Observability.Value;
            }

            // Apply branding patch
            if (request.Settings.Branding is not null)
            {
                var b = current.Branding;
                var rb = request.Settings.Branding;
                if (rb.AccentColor is not null)  b.AccentColor  = rb.AccentColor;
                if (rb.CustomDomain is not null) b.CustomDomain = rb.CustomDomain;
                if (rb.LogoUrl is not null)      b.LogoUrl      = rb.LogoUrl;
            }

            org.UpdateSettings(current);
        }

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
    string? LogoUrl,
    UpdateOrgSettingsRequest? Settings
);

public record UpdateOrgSettingsRequest(
    string? DefaultTimezone,
    string? Currency,
    int? FiscalYearStart,
    UpdateOrgFeaturesRequest? Features,
    UpdateOrgBrandingRequest? Branding
);

public record UpdateOrgFeaturesRequest(
    bool? Chat,
    bool? Projects,
    bool? Docs,
    bool? Ai,
    bool? Erp,
    bool? Finance,
    bool? Crm,
    bool? Sales,
    bool? Invoicing,
    bool? Manufacturing,
    bool? Purchase,
    bool? Hr,
    bool? Marketing,
    bool? Maintenance,
    bool? Support,
    bool? Observability
);

public record UpdateOrgBrandingRequest(
    string? AccentColor,
    string? CustomDomain,
    string? LogoUrl
);
