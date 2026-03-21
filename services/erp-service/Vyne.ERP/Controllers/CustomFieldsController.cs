using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Settings;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Controllers;

/// <summary>
/// Extension controller for reading/writing custom field values on ERP records.
/// Follows the pattern: GET /products/{id}/custom-fields, PUT /products/{id}/custom-fields
/// Mirrors the same pattern for orders, customers, suppliers.
/// </summary>
[ApiController]
[Authorize]
public class CustomFieldsController : ControllerBase
{
    private readonly ERPDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ILogger<CustomFieldsController> _logger;

    public CustomFieldsController(
        ERPDbContext db,
        ITenantContext tenant,
        ILogger<CustomFieldsController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    // ── Products ──────────────────────────────────────────────────────────────

    [HttpGet("inventory/products/{id:guid}/custom-fields")]
    public async Task<IActionResult> GetProductCustomFields(Guid id, CancellationToken ct)
        => await GetCustomFields(id, CustomFieldEntity.Product, ct);

    [HttpPut("inventory/products/{id:guid}/custom-fields")]
    public async Task<IActionResult> SetProductCustomFields(
        Guid id,
        [FromBody] List<SetCustomFieldValueRequest> body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        // Verify product exists
        var exists = await _db.Products.AnyAsync(p => p.Id == id, ct);
        if (!exists)
            return NotFound(Error("NOT_FOUND", $"Product '{id}' not found."));

        return await SetCustomFields(id, CustomFieldEntity.Product, body, ct);
    }

    // ── Orders ─────────────────────────────────────────────────────────────────

    [HttpGet("orders/{id:guid}/custom-fields")]
    public async Task<IActionResult> GetOrderCustomFields(Guid id, CancellationToken ct)
        => await GetCustomFields(id, CustomFieldEntity.Order, ct);

    [HttpPut("orders/{id:guid}/custom-fields")]
    public async Task<IActionResult> SetOrderCustomFields(
        Guid id,
        [FromBody] List<SetCustomFieldValueRequest> body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var exists = await _db.Orders.AnyAsync(o => o.Id == id, ct);
        if (!exists)
            return NotFound(Error("NOT_FOUND", $"Order '{id}' not found."));

        return await SetCustomFields(id, CustomFieldEntity.Order, body, ct);
    }

    // ── Customers ──────────────────────────────────────────────────────────────

    [HttpGet("customers/{id:guid}/custom-fields")]
    public async Task<IActionResult> GetCustomerCustomFields(Guid id, CancellationToken ct)
        => await GetCustomFields(id, CustomFieldEntity.Customer, ct);

    [HttpPut("customers/{id:guid}/custom-fields")]
    public async Task<IActionResult> SetCustomerCustomFields(
        Guid id,
        [FromBody] List<SetCustomFieldValueRequest> body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var exists = await _db.Customers.AnyAsync(c => c.Id == id, ct);
        if (!exists)
            return NotFound(Error("NOT_FOUND", $"Customer '{id}' not found."));

        return await SetCustomFields(id, CustomFieldEntity.Customer, body, ct);
    }

    // ── Suppliers ──────────────────────────────────────────────────────────────

    [HttpGet("suppliers/{id:guid}/custom-fields")]
    public async Task<IActionResult> GetSupplierCustomFields(Guid id, CancellationToken ct)
        => await GetCustomFields(id, CustomFieldEntity.Supplier, ct);

    [HttpPut("suppliers/{id:guid}/custom-fields")]
    public async Task<IActionResult> SetSupplierCustomFields(
        Guid id,
        [FromBody] List<SetCustomFieldValueRequest> body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var exists = await _db.Suppliers.AnyAsync(s => s.Id == id, ct);
        if (!exists)
            return NotFound(Error("NOT_FOUND", $"Supplier '{id}' not found."));

        return await SetCustomFields(id, CustomFieldEntity.Supplier, body, ct);
    }

    // ── Shared implementation ─────────────────────────────────────────────────

    private async Task<IActionResult> GetCustomFields(
        Guid recordId,
        CustomFieldEntity entity,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        // Fetch active fields for this entity/org joined with any stored values
        var fields = await _db.CustomFields
            .AsNoTracking()
            .Where(f => f.OrgId == orgId && f.Entity == entity && f.IsActive)
            .OrderBy(f => f.DisplayOrder)
            .ThenBy(f => f.Name)
            .ToListAsync(ct);

        var values = await _db.CustomFieldValues
            .AsNoTracking()
            .Where(v => v.RecordId == recordId && fields.Select(f => f.Id).Contains(v.FieldId))
            .ToListAsync(ct);

        var result = fields.Select(f =>
        {
            var val = values.FirstOrDefault(v => v.FieldId == f.Id);
            return new
            {
                FieldId = f.Id,
                f.ApiKey,
                f.Name,
                f.Type,
                f.IsRequired,
                f.Options,
                f.DisplayOrder,
                Value = val?.Value ?? f.DefaultValue,
                UpdatedAt = val?.UpdatedAt,
            };
        }).ToList();

        return Ok(new { total = result.Count, fields = result });
    }

    private async Task<IActionResult> SetCustomFields(
        Guid recordId,
        CustomFieldEntity entity,
        List<SetCustomFieldValueRequest> values,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (values == null || values.Count == 0)
            return BadRequest(Error("VALIDATION_ERROR", "At least one field value is required."));

        // Load all active fields for this org/entity
        var fields = await _db.CustomFields
            .Where(f => f.OrgId == orgId && f.Entity == entity && f.IsActive)
            .ToListAsync(ct);

        var errors = new List<string>();

        foreach (var req in values)
        {
            // Resolve by fieldId or apiKey
            CustomField? field = null;
            if (req.FieldId.HasValue)
                field = fields.FirstOrDefault(f => f.Id == req.FieldId.Value);
            else if (!string.IsNullOrWhiteSpace(req.FieldApiKey))
                field = fields.FirstOrDefault(f => f.ApiKey == req.FieldApiKey);

            if (field is null)
            {
                errors.Add($"Field '{req.FieldId?.ToString() ?? req.FieldApiKey}' not found or inactive.");
                continue;
            }

            // Validate required
            if (field.IsRequired && string.IsNullOrWhiteSpace(req.Value))
            {
                errors.Add($"Field '{field.Name}' is required and cannot be empty.");
                continue;
            }

            // Validate select options
            if (field.Type == CustomFieldType.Select && req.Value != null &&
                field.Options != null && !field.Options.Contains(req.Value))
            {
                errors.Add($"Value '{req.Value}' is not a valid option for field '{field.Name}'.");
                continue;
            }

            // Upsert value
            var existing = await _db.CustomFieldValues
                .FirstOrDefaultAsync(v => v.FieldId == field.Id && v.RecordId == recordId, ct);

            if (existing != null)
                existing.SetValue(req.Value);
            else
                _db.CustomFieldValues.Add(CustomFieldValue.Create(field.Id, recordId, req.Value));
        }

        if (errors.Count > 0)
            return UnprocessableEntity(new { error = new { code = "VALIDATION_ERRORS", messages = errors } });

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Custom fields updated for {Entity} {RecordId} OrgId={OrgId}",
            entity, recordId, orgId);

        return await GetCustomFields(recordId, entity, ct);
    }

    private static object Error(string code, string message) =>
        new { error = new { code, message } };
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record SetCustomFieldValueRequest(
    Guid? FieldId,
    string? FieldApiKey,
    string? Value);
