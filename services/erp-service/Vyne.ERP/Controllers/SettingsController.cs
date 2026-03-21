using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Inventory;
using Vyne.ERP.Domain.Pricing;
using Vyne.ERP.Domain.Settings;
using Vyne.ERP.Infrastructure.Data;
using Vyne.ERP.Infrastructure.Seeds;

namespace Vyne.ERP.Controllers;

[ApiController]
[Authorize]
[Route("settings")]
public class SettingsController : ControllerBase
{
    private readonly ERPDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ILogger<SettingsController> _logger;

    public SettingsController(ERPDbContext db, ITenantContext tenant, ILogger<SettingsController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /settings ─────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetSettings(CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var settings = await _db.OrgSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.OrgId == orgId, ct);

        if (settings is null)
        {
            // Auto-create defaults on first access
            settings = OrgSettings.CreateDefault(orgId, "My Company");
            _db.OrgSettings.Add(settings);
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Created default OrgSettings for OrgId={OrgId}", orgId);
        }

        return Ok(settings);
    }

    // ── PATCH /settings ────────────────────────────────────────────────────────

    [HttpPatch]
    public async Task<IActionResult> UpdateSettings(
        [FromBody] UpdateSettingsRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var settings = await _db.OrgSettings.FirstOrDefaultAsync(s => s.OrgId == orgId, ct);
        if (settings is null)
        {
            settings = OrgSettings.CreateDefault(orgId, body.CompanyName ?? "My Company");
            _db.OrgSettings.Add(settings);
        }

        if (body.FiscalYearStartMonth.HasValue &&
            (body.FiscalYearStartMonth.Value < 1 || body.FiscalYearStartMonth.Value > 12))
            return BadRequest(Error("VALIDATION_ERROR", "FiscalYearStartMonth must be between 1 and 12."));

        if (body.DefaultTaxRate.HasValue && (body.DefaultTaxRate.Value < 0 || body.DefaultTaxRate.Value > 100))
            return BadRequest(Error("VALIDATION_ERROR", "DefaultTaxRate must be between 0 and 100."));

        if (body.DefaultPaymentTermsDays.HasValue && body.DefaultPaymentTermsDays.Value < 0)
            return BadRequest(Error("VALIDATION_ERROR", "DefaultPaymentTermsDays cannot be negative."));

        settings.Update(
            companyName: body.CompanyName,
            companyLogo: body.CompanyLogo,
            address: body.Address,
            phone: body.Phone,
            email: body.Email,
            website: body.Website,
            taxId: body.TaxId,
            baseCurrency: body.BaseCurrency,
            dateFormat: body.DateFormat,
            fiscalYearStartMonth: body.FiscalYearStartMonth,
            orderNumberPrefix: body.OrderNumberPrefix,
            invoiceNumberPrefix: body.InvoiceNumberPrefix,
            trackInventory: body.TrackInventory,
            allowNegativeStock: body.AllowNegativeStock,
            autoReorder: body.AutoReorder,
            defaultTaxRate: body.DefaultTaxRate,
            pricesIncludeTax: body.PricesIncludeTax,
            defaultPaymentTermsDays: body.DefaultPaymentTermsDays);

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("OrgSettings updated for OrgId={OrgId}", orgId);
        return Ok(settings);
    }

    // ── GET /settings/custom-fields ────────────────────────────────────────────

    [HttpGet("custom-fields")]
    public async Task<IActionResult> ListCustomFields(
        [FromQuery] CustomFieldEntity? entity,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var query = _db.CustomFields
            .AsNoTracking()
            .Where(f => f.OrgId == orgId && f.IsActive);

        if (entity.HasValue)
            query = query.Where(f => f.Entity == entity.Value);

        var fields = await query
            .OrderBy(f => f.Entity)
            .ThenBy(f => f.DisplayOrder)
            .ThenBy(f => f.Name)
            .ToListAsync(ct);

        return Ok(new { total = fields.Count, items = fields });
    }

    // ── POST /settings/custom-fields ───────────────────────────────────────────

    [HttpPost("custom-fields")]
    public async Task<IActionResult> CreateCustomField(
        [FromBody] CreateCustomFieldRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(Error("VALIDATION_ERROR", "Name is required."));

        CustomField field;
        try
        {
            field = CustomField.Create(
                orgId,
                body.Entity,
                body.Name,
                body.Type,
                body.IsRequired,
                body.DefaultValue,
                body.Options,
                body.DisplayOrder);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        // Check for duplicate ApiKey per org+entity
        var duplicate = await _db.CustomFields
            .AnyAsync(f => f.OrgId == orgId && f.Entity == body.Entity &&
                           f.ApiKey == field.ApiKey && f.IsActive, ct);
        if (duplicate)
            return Conflict(Error("DUPLICATE_FIELD",
                $"A custom field with API key '{field.ApiKey}' already exists for this entity."));

        _db.CustomFields.Add(field);
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("CustomField created: {FieldId} ApiKey={ApiKey}", field.Id, field.ApiKey);
        return CreatedAtAction(nameof(ListCustomFields), new { entity = body.Entity }, field);
    }

    // ── PATCH /settings/custom-fields/{id} ─────────────────────────────────────

    [HttpPatch("custom-fields/{id:guid}")]
    public async Task<IActionResult> UpdateCustomField(
        Guid id,
        [FromBody] UpdateCustomFieldRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var field = await _db.CustomFields
            .FirstOrDefaultAsync(f => f.Id == id && f.OrgId == orgId, ct);

        if (field is null)
            return NotFound(Error("NOT_FOUND", $"Custom field '{id}' not found."));

        try
        {
            field.Update(body.Name, body.IsRequired, body.DefaultValue, body.Options, body.DisplayOrder);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);
        return Ok(field);
    }

    // ── DELETE /settings/custom-fields/{id} ────────────────────────────────────

    [HttpDelete("custom-fields/{id:guid}")]
    public async Task<IActionResult> DeactivateCustomField(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var field = await _db.CustomFields
            .FirstOrDefaultAsync(f => f.Id == id && f.OrgId == orgId, ct);

        if (field is null)
            return NotFound(Error("NOT_FOUND", $"Custom field '{id}' not found."));

        field.Deactivate();
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── GET /settings/tax-rates ────────────────────────────────────────────────

    [HttpGet("tax-rates")]
    public async Task<IActionResult> ListTaxRates(CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var rates = await _db.TaxRates
            .AsNoTracking()
            .Where(r => r.OrgId == orgId)
            .OrderByDescending(r => r.IsDefault)
            .ThenBy(r => r.Name)
            .ToListAsync(ct);

        return Ok(new { total = rates.Count, items = rates });
    }

    // ── POST /settings/tax-rates ───────────────────────────────────────────────

    [HttpPost("tax-rates")]
    public async Task<IActionResult> CreateTaxRate(
        [FromBody] CreateTaxRateRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        TaxRate rate;
        try
        {
            rate = TaxRate.Create(orgId, body.Name, body.Rate, body.IsDefault);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        // If this is the new default, clear existing defaults
        if (body.IsDefault)
        {
            var existingDefaults = await _db.TaxRates
                .Where(r => r.OrgId == orgId && r.IsDefault)
                .ToListAsync(ct);
            foreach (var d in existingDefaults) d.ClearDefault();
        }

        _db.TaxRates.Add(rate);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(ListTaxRates), null, rate);
    }

    // ── PATCH /settings/tax-rates/{id} ─────────────────────────────────────────

    [HttpPatch("tax-rates/{id:guid}")]
    public async Task<IActionResult> UpdateTaxRate(
        Guid id,
        [FromBody] UpdateTaxRateRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var rate = await _db.TaxRates
            .FirstOrDefaultAsync(r => r.Id == id && r.OrgId == orgId, ct);

        if (rate is null)
            return NotFound(Error("NOT_FOUND", $"Tax rate '{id}' not found."));

        try
        {
            rate.Update(body.Name, body.Rate);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        if (body.IsDefault == true)
        {
            var existingDefaults = await _db.TaxRates
                .Where(r => r.OrgId == orgId && r.IsDefault && r.Id != id)
                .ToListAsync(ct);
            foreach (var d in existingDefaults) d.ClearDefault();
            rate.SetDefault();
        }

        await _db.SaveChangesAsync(ct);
        return Ok(rate);
    }

    // ── DELETE /settings/tax-rates/{id} ────────────────────────────────────────

    [HttpDelete("tax-rates/{id:guid}")]
    public async Task<IActionResult> DeactivateTaxRate(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var rate = await _db.TaxRates
            .FirstOrDefaultAsync(r => r.Id == id && r.OrgId == orgId, ct);

        if (rate is null)
            return NotFound(Error("NOT_FOUND", $"Tax rate '{id}' not found."));

        rate.Deactivate();
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── GET /settings/categories ───────────────────────────────────────────────

    [HttpGet("categories")]
    public async Task<IActionResult> ListCategories(CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var all = await _db.ProductCategories
            .AsNoTracking()
            .Where(c => c.OrgId == orgId && c.IsActive)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        // Build tree structure
        var tree = BuildCategoryTree(all, null);
        return Ok(new { total = all.Count, items = tree });
    }

    // ── POST /settings/categories ──────────────────────────────────────────────

    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateCategoryRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(Error("VALIDATION_ERROR", "Category name is required."));

        // Verify parent exists if provided
        if (body.ParentId.HasValue)
        {
            var parentExists = await _db.ProductCategories
                .AnyAsync(c => c.Id == body.ParentId.Value && c.OrgId == orgId, ct);
            if (!parentExists)
                return UnprocessableEntity(Error("PARENT_NOT_FOUND",
                    $"Parent category '{body.ParentId}' not found."));
        }

        ProductCategory category;
        try
        {
            category = ProductCategory.Create(
                orgId, body.Name, body.ParentId, body.Description, body.Icon,
                body.DefaultTaxRate ?? 0m);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.ProductCategories.Add(category);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(ListCategories), null, category);
    }

    // ── PATCH /settings/categories/{id} ────────────────────────────────────────

    [HttpPatch("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(
        Guid id,
        [FromBody] UpdateCategoryRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var category = await _db.ProductCategories
            .FirstOrDefaultAsync(c => c.Id == id && c.OrgId == orgId, ct);

        if (category is null)
            return NotFound(Error("NOT_FOUND", $"Category '{id}' not found."));

        try
        {
            category.Update(body.Name, body.Description, body.Icon, body.DefaultTaxRate, body.ParentId);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);
        return Ok(category);
    }

    // ── GET /settings/units ─────────────────────────────────────────────────────

    [HttpGet("units")]
    public async Task<IActionResult> ListUnits(CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var units = await _db.UnitsOfMeasure
            .AsNoTracking()
            .Where(u => u.OrgId == orgId && u.IsActive)
            .OrderBy(u => u.Category)
            .ThenByDescending(u => u.IsBase)
            .ThenBy(u => u.Name)
            .ToListAsync(ct);

        // Group by category
        var grouped = units
            .GroupBy(u => u.Category)
            .Select(g => new
            {
                category = g.Key,
                units = g.ToList()
            })
            .ToList();

        return Ok(new { total = units.Count, groups = grouped });
    }

    // ── POST /settings/units ───────────────────────────────────────────────────

    [HttpPost("units")]
    public async Task<IActionResult> CreateUnit(
        [FromBody] CreateUnitRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        UnitOfMeasure unit;
        try
        {
            unit = UnitOfMeasure.Create(
                orgId, body.Name, body.Symbol, body.Category,
                body.IsBase, body.ConversionFactor ?? 1m);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        // If creating a base unit, ensure no other base unit exists in this category
        if (body.IsBase)
        {
            var existingBase = await _db.UnitsOfMeasure
                .AnyAsync(u => u.OrgId == orgId && u.Category == body.Category &&
                               u.IsBase && u.IsActive, ct);
            if (existingBase)
                return Conflict(Error("BASE_UNIT_EXISTS",
                    $"A base unit already exists for category '{body.Category}'."));
        }

        _db.UnitsOfMeasure.Add(unit);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(ListUnits), null, unit);
    }

    // ── GET /settings/price-lists ───────────────────────────────────────────────

    [HttpGet("price-lists")]
    public async Task<IActionResult> ListPriceLists(CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var lists = await _db.PriceLists
            .AsNoTracking()
            .Where(l => l.OrgId == orgId)
            .OrderBy(l => l.Name)
            .Select(l => new
            {
                l.Id,
                l.Name,
                l.Currency,
                l.GlobalDiscount,
                l.IsActive,
                l.CreatedAt,
                ItemCount = l.Items.Count,
            })
            .ToListAsync(ct);

        return Ok(new { total = lists.Count, items = lists });
    }

    // ── POST /settings/price-lists ──────────────────────────────────────────────

    [HttpPost("price-lists")]
    public async Task<IActionResult> CreatePriceList(
        [FromBody] CreatePriceListRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        PriceList list;
        try
        {
            list = PriceList.Create(orgId, body.Name, body.Currency ?? "USD", body.GlobalDiscount);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.PriceLists.Add(list);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetPriceList), new { id = list.Id }, list);
    }

    // ── GET /settings/price-lists/{id} ─────────────────────────────────────────

    [HttpGet("price-lists/{id:guid}")]
    public async Task<IActionResult> GetPriceList(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var list = await _db.PriceLists
            .AsNoTracking()
            .Include(l => l.Items)
            .FirstOrDefaultAsync(l => l.Id == id && l.OrgId == orgId, ct);

        if (list is null)
            return NotFound(Error("NOT_FOUND", $"Price list '{id}' not found."));

        return Ok(list);
    }

    // ── POST /settings/price-lists/{id}/items ──────────────────────────────────

    [HttpPost("price-lists/{id:guid}/items")]
    public async Task<IActionResult> AddPriceListItem(
        Guid id,
        [FromBody] AddPriceListItemRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var list = await _db.PriceLists
            .Include(l => l.Items)
            .FirstOrDefaultAsync(l => l.Id == id && l.OrgId == orgId, ct);

        if (list is null)
            return NotFound(Error("NOT_FOUND", $"Price list '{id}' not found."));

        // Verify product exists
        var productExists = await _db.Products
            .AnyAsync(p => p.Id == body.ProductId, ct);
        if (!productExists)
            return UnprocessableEntity(Error("PRODUCT_NOT_FOUND",
                $"Product '{body.ProductId}' not found."));

        PriceListItem item;
        try
        {
            item = list.AddItem(body.ProductId, body.Price, body.MinQty);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);
        return Ok(item);
    }

    // ── DELETE /settings/price-lists/{id}/items/{itemId} ───────────────────────

    [HttpDelete("price-lists/{id:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> RemovePriceListItem(Guid id, Guid itemId, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var list = await _db.PriceLists
            .Include(l => l.Items)
            .FirstOrDefaultAsync(l => l.Id == id && l.OrgId == orgId, ct);

        if (list is null)
            return NotFound(Error("NOT_FOUND", $"Price list '{id}' not found."));

        var removed = list.RemoveItem(itemId);
        if (!removed)
            return NotFound(Error("NOT_FOUND", $"Item '{itemId}' not found on this price list."));

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── GET /settings/reorder-rules ─────────────────────────────────────────────

    [HttpGet("reorder-rules")]
    public async Task<IActionResult> ListReorderRules(CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var rules = await _db.ReorderRules
            .AsNoTracking()
            .Where(r => r.OrgId == orgId && r.IsActive)
            .OrderBy(r => r.ProductId)
            .ToListAsync(ct);

        return Ok(new { total = rules.Count, items = rules });
    }

    // ── POST /settings/reorder-rules ────────────────────────────────────────────

    [HttpPost("reorder-rules")]
    public async Task<IActionResult> CreateReorderRule(
        [FromBody] CreateReorderRuleRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        // Verify product exists
        var productExists = await _db.Products
            .AnyAsync(p => p.Id == body.ProductId, ct);
        if (!productExists)
            return UnprocessableEntity(Error("PRODUCT_NOT_FOUND",
                $"Product '{body.ProductId}' not found."));

        // Check for existing active rule on same product
        var existingRule = await _db.ReorderRules
            .AnyAsync(r => r.OrgId == orgId && r.ProductId == body.ProductId && r.IsActive, ct);
        if (existingRule)
            return Conflict(Error("RULE_EXISTS",
                "An active reorder rule already exists for this product. Deactivate it first."));

        ReorderRule rule;
        try
        {
            rule = ReorderRule.Create(
                orgId, body.ProductId, body.MinQty, body.ReorderQty,
                body.SupplierId, body.MaxQty ?? 0m);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.ReorderRules.Add(rule);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(ListReorderRules), null, rule);
    }

    // ── DELETE /settings/reorder-rules/{id} ────────────────────────────────────

    [HttpDelete("reorder-rules/{id:guid}")]
    public async Task<IActionResult> DeactivateReorderRule(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var rule = await _db.ReorderRules
            .FirstOrDefaultAsync(r => r.Id == id && r.OrgId == orgId, ct);

        if (rule is null)
            return NotFound(Error("NOT_FOUND", $"Reorder rule '{id}' not found."));

        rule.Deactivate();
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── POST /settings/seed ────────────────────────────────────────────────────

    [HttpPost("seed")]
    public async Task<IActionResult> SeedDefaults(CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        await DefaultSettingsSeed.SeedAsync(_db, orgId, ct);
        _logger.LogInformation("Default settings seeded for OrgId={OrgId}", orgId);
        return Ok(new { message = "Default settings seeded successfully." });
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private static List<object> BuildCategoryTree(
        List<ProductCategory> all, Guid? parentId)
    {
        return all
            .Where(c => c.ParentId == parentId)
            .OrderBy(c => c.Name)
            .Select(c => (object)new
            {
                c.Id,
                c.OrgId,
                c.ParentId,
                c.Name,
                c.Description,
                c.Icon,
                c.DefaultTaxRate,
                c.IsActive,
                c.CreatedAt,
                children = BuildCategoryTree(all, c.Id),
            })
            .ToList();
    }

    private static object Error(string code, string message) =>
        new { error = new { code, message } };
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record UpdateSettingsRequest(
    string? CompanyName,
    string? CompanyLogo,
    string? Address,
    string? Phone,
    string? Email,
    string? Website,
    string? TaxId,
    string? BaseCurrency,
    string? DateFormat,
    int? FiscalYearStartMonth,
    string? OrderNumberPrefix,
    string? InvoiceNumberPrefix,
    bool? TrackInventory,
    bool? AllowNegativeStock,
    bool? AutoReorder,
    decimal? DefaultTaxRate,
    bool? PricesIncludeTax,
    int? DefaultPaymentTermsDays);

public record CreateCustomFieldRequest(
    CustomFieldEntity Entity,
    string Name,
    CustomFieldType Type,
    bool IsRequired = false,
    string? DefaultValue = null,
    string[]? Options = null,
    int DisplayOrder = 0);

public record UpdateCustomFieldRequest(
    string? Name,
    bool? IsRequired,
    string? DefaultValue,
    string[]? Options,
    int? DisplayOrder);

public record CreateTaxRateRequest(
    string Name,
    decimal Rate,
    bool IsDefault = false);

public record UpdateTaxRateRequest(
    string? Name,
    decimal? Rate,
    bool? IsDefault);

public record CreateCategoryRequest(
    string Name,
    Guid? ParentId,
    string? Description,
    string? Icon,
    decimal? DefaultTaxRate);

public record UpdateCategoryRequest(
    string? Name,
    string? Description,
    string? Icon,
    decimal? DefaultTaxRate,
    Guid? ParentId);

public record CreateUnitRequest(
    string Name,
    string Symbol,
    string Category,
    bool IsBase = false,
    decimal? ConversionFactor = null);

public record CreatePriceListRequest(
    string Name,
    string? Currency,
    decimal? GlobalDiscount);

public record AddPriceListItemRequest(
    Guid ProductId,
    decimal Price,
    int? MinQty);

public record CreateReorderRuleRequest(
    Guid ProductId,
    decimal MinQty,
    decimal ReorderQty,
    Guid? SupplierId,
    decimal? MaxQty);
