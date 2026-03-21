using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Inventory;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Controllers;

[ApiController]
[Authorize]
[Route("suppliers")]
public class SuppliersController : ControllerBase
{
    private readonly ERPDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ILogger<SuppliersController> _logger;

    public SuppliersController(ERPDbContext db, ITenantContext tenant, ILogger<SuppliersController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /suppliers ────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> ListSuppliers(
        [FromQuery] string? search,
        [FromQuery] bool? active,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _db.Suppliers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s =>
                s.Name.ToLower().Contains(search.ToLower()) ||
                (s.Email != null && s.Email.ToLower().Contains(search.ToLower())));

        if (active.HasValue)
            query = query.Where(s => s.IsActive == active.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    // ── POST /suppliers ───────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(Error("VALIDATION_ERROR", "Supplier name is required."));

        Supplier supplier;
        try
        {
            supplier = Supplier.Create(
                orgId,
                body.Name,
                email: body.Email,
                phone: body.Phone,
                address: body.Address,
                website: body.Website,
                contactPerson: body.ContactPerson);

            if (body.Notes is not null)
                supplier.Update(notes: body.Notes);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Supplier created: {SupplierId} Name={Name} OrgId={OrgId}",
            supplier.Id, supplier.Name, orgId);

        return CreatedAtAction(nameof(GetSupplier), new { id = supplier.Id }, supplier);
    }

    // ── GET /suppliers/{id} ───────────────────────────────────────────────────

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSupplier(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var supplier = await _db.Suppliers
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (supplier is null)
            return NotFound(Error("NOT_FOUND", $"Supplier '{id}' not found."));

        // Enrich with product count
        var productCount = await _db.Products
            .CountAsync(p => p.SupplierId == id.ToString(), ct);

        return Ok(new
        {
            supplier.Id,
            supplier.OrgId,
            supplier.Name,
            supplier.Email,
            supplier.Phone,
            supplier.Address,
            supplier.Website,
            supplier.ContactPerson,
            supplier.Notes,
            supplier.IsActive,
            supplier.CreatedAt,
            supplier.UpdatedAt,
            ProductCount = productCount,
        });
    }

    // ── PATCH /suppliers/{id} ─────────────────────────────────────────────────

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> UpdateSupplier(Guid id, [FromBody] UpdateSupplierRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (supplier is null)
            return NotFound(Error("NOT_FOUND", $"Supplier '{id}' not found."));

        try
        {
            supplier.Update(
                name: body.Name,
                email: body.Email,
                phone: body.Phone,
                address: body.Address,
                website: body.Website,
                contactPerson: body.ContactPerson,
                notes: body.Notes);

            if (body.IsActive.HasValue)
            {
                if (body.IsActive.Value) supplier.Activate();
                else supplier.Deactivate();
            }
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Supplier updated: {SupplierId}", id);
        return Ok(supplier);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static object Error(string code, string message) =>
        new { error = new { code, message } };
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record CreateSupplierRequest(
    string Name,
    string? Email,
    string? Phone,
    string? Address,
    string? Website,
    string? ContactPerson,
    string? Notes);

public record UpdateSupplierRequest(
    string? Name,
    string? Email,
    string? Phone,
    string? Address,
    string? Website,
    string? ContactPerson,
    string? Notes,
    bool? IsActive);
