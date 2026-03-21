using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Inventory;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Controllers;

[ApiController]
[Authorize]
[Route("inventory")]
public class InventoryController : ControllerBase
{
    private readonly ERPDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(ERPDbContext db, ITenantContext tenant, ILogger<InventoryController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /inventory/products ───────────────────────────────────────────────

    [HttpGet("products")]
    public async Task<IActionResult> ListProducts(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] bool? active,
        [FromQuery] ProductType? type,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _db.Products.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p =>
                p.Name.ToLower().Contains(search.ToLower()) ||
                p.Sku.ToLower().Contains(search.ToLower()));

        if (active.HasValue)
            query = query.Where(p => p.IsActive == active.Value);

        if (type.HasValue)
            query = query.Where(p => p.Type == type.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new
            {
                p.Id,
                p.OrgId,
                p.Sku,
                p.Name,
                p.Description,
                p.Type,
                p.CostPrice,
                p.SalePrice,
                p.StockQuantity,
                p.ReorderPoint,
                p.ReorderQuantity,
                p.SupplierId,
                p.Category,
                p.ImageUrl,
                p.IsActive,
                p.IsLowStock,
                p.CreatedAt,
                p.UpdatedAt,
            })
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    // ── POST /inventory/products ──────────────────────────────────────────────

    [HttpPost("products")]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.Sku))
            return BadRequest(Error("VALIDATION_ERROR", "SKU is required."));
        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(Error("VALIDATION_ERROR", "Name is required."));

        // Check SKU uniqueness within org
        var skuNorm = body.Sku.Trim().ToUpperInvariant();
        var exists = await _db.Products.AnyAsync(p => p.Sku == skuNorm, ct);
        if (exists)
            return Conflict(Error("SKU_CONFLICT", $"A product with SKU '{skuNorm}' already exists."));

        Product product;
        try
        {
            product = Product.Create(
                orgId,
                body.Sku,
                body.Name,
                body.Type,
                body.CostPrice,
                body.SalePrice,
                body.ReorderPoint ?? 0,
                body.ReorderQuantity ?? 10);

            product.Update(
                description: body.Description,
                category: body.Category,
                imageUrl: body.ImageUrl,
                supplierId: body.SupplierId);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.Products.Add(product);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Product created: {ProductId} SKU={Sku} OrgId={OrgId}", product.Id, product.Sku, orgId);
        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
    }

    // ── GET /inventory/products/{id} ──────────────────────────────────────────

    [HttpGet("products/{id:guid}")]
    public async Task<IActionResult> GetProduct(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var product = await _db.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (product is null)
            return NotFound(Error("NOT_FOUND", $"Product '{id}' not found."));

        return Ok(product);
    }

    // ── PATCH /inventory/products/{id} ────────────────────────────────────────

    [HttpPatch("products/{id:guid}")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product is null)
            return NotFound(Error("NOT_FOUND", $"Product '{id}' not found."));

        try
        {
            product.Update(
                name: body.Name,
                description: body.Description,
                costPrice: body.CostPrice,
                salePrice: body.SalePrice,
                reorderPoint: body.ReorderPoint,
                reorderQuantity: body.ReorderQuantity,
                category: body.Category,
                imageUrl: body.ImageUrl,
                supplierId: body.SupplierId);

            if (body.IsActive.HasValue)
            {
                if (body.IsActive.Value) product.Activate();
                else product.Deactivate();
            }
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Product updated: {ProductId}", id);
        return Ok(product);
    }

    // ── POST /inventory/products/{id}/adjust-stock ────────────────────────────

    [HttpPost("products/{id:guid}/adjust-stock")]
    public async Task<IActionResult> AdjustStock(Guid id, [FromBody] AdjustStockRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.Reason))
            return BadRequest(Error("VALIDATION_ERROR", "Reason is required for stock adjustment."));
        if (body.Delta == 0)
            return BadRequest(Error("VALIDATION_ERROR", "Delta cannot be zero."));

        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (product is null)
            return NotFound(Error("NOT_FOUND", $"Product '{id}' not found."));

        try
        {
            product.AdjustStock(body.Delta, body.Reason);
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("STOCK_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Stock adjusted for product {ProductId}: delta={Delta}, reason={Reason}, newQty={Qty}",
            id, body.Delta, body.Reason, product.StockQuantity);

        return Ok(new
        {
            product.Id,
            product.Sku,
            product.Name,
            product.StockQuantity,
            product.IsLowStock,
            product.ReorderPoint,
            product.UpdatedAt,
        });
    }

    // ── GET /inventory/low-stock ──────────────────────────────────────────────

    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStockProducts(CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var items = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive && p.StockQuantity <= p.ReorderPoint)
            .OrderBy(p => p.StockQuantity)
            .Select(p => new
            {
                p.Id,
                p.Sku,
                p.Name,
                p.Category,
                p.StockQuantity,
                p.ReorderPoint,
                p.ReorderQuantity,
                p.SupplierId,
                p.UpdatedAt,
                Deficit = p.ReorderPoint - p.StockQuantity + p.ReorderQuantity,
            })
            .ToListAsync(ct);

        return Ok(new { total = items.Count, items });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static object Error(string code, string message) =>
        new { error = new { code, message } };
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record CreateProductRequest(
    string Sku,
    string Name,
    string? Description,
    ProductType Type,
    decimal CostPrice,
    decimal SalePrice,
    int? ReorderPoint,
    int? ReorderQuantity,
    string? SupplierId,
    string? Category,
    string? ImageUrl);

public record UpdateProductRequest(
    string? Name,
    string? Description,
    decimal? CostPrice,
    decimal? SalePrice,
    int? ReorderPoint,
    int? ReorderQuantity,
    string? SupplierId,
    string? Category,
    string? ImageUrl,
    bool? IsActive);

public record AdjustStockRequest(int Delta, string Reason);
