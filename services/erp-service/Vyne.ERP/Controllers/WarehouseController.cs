using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Warehouse;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Controllers;

[ApiController]
[Authorize]
public class WarehouseController : ControllerBase
{
    private readonly ERPDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ILogger<WarehouseController> _logger;

    public WarehouseController(ERPDbContext db, ITenantContext tenant, ILogger<WarehouseController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /warehouses ───────────────────────────────────────────────────────

    [HttpGet("warehouses")]
    public async Task<IActionResult> ListWarehouses(
        [FromQuery] bool? active,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _db.Warehouses.AsNoTracking();

        if (active.HasValue)
            query = query.Where(w => w.IsActive == active.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(w => w.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(w => new
            {
                w.Id,
                w.OrgId,
                w.Name,
                w.Address,
                w.IsActive,
                w.CreatedAt,
                LocationCount = w.Locations.Count(l => l.IsActive),
            })
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    // ── POST /warehouses ──────────────────────────────────────────────────────

    [HttpPost("warehouses")]
    public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(Error("VALIDATION_ERROR", "Warehouse name is required."));

        Warehouse warehouse;
        try
        {
            warehouse = Warehouse.Create(orgId, body.Name, body.Address);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.Warehouses.Add(warehouse);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Warehouse created: {WarehouseId} Name={Name} OrgId={OrgId}",
            warehouse.Id, warehouse.Name, orgId);

        return CreatedAtAction(nameof(GetWarehouseLocations), new { id = warehouse.Id }, warehouse);
    }

    // ── GET /warehouses/{id}/locations ────────────────────────────────────────

    [HttpGet("warehouses/{id:guid}/locations")]
    public async Task<IActionResult> GetWarehouseLocations(
        Guid id,
        [FromQuery] bool? active,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var warehouse = await _db.Warehouses.AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == id, ct);
        if (warehouse is null)
            return NotFound(Error("NOT_FOUND", $"Warehouse '{id}' not found."));

        var query = _db.WarehouseLocations.AsNoTracking()
            .Where(l => l.WarehouseId == id);

        if (active.HasValue)
            query = query.Where(l => l.IsActive == active.Value);

        var locations = await query
            .OrderBy(l => l.Name)
            .ToListAsync(ct);

        return Ok(new
        {
            WarehouseId = id,
            WarehouseName = warehouse.Name,
            Total = locations.Count,
            Locations = locations,
        });
    }

    // ── POST /warehouses/{id}/locations ───────────────────────────────────────

    [HttpPost("warehouses/{id:guid}/locations")]
    public async Task<IActionResult> CreateLocation(
        Guid id,
        [FromBody] CreateLocationRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(Error("VALIDATION_ERROR", "Location name is required."));

        var warehouse = await _db.Warehouses.AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == id, ct);
        if (warehouse is null)
            return NotFound(Error("NOT_FOUND", $"Warehouse '{id}' not found."));

        // Check name uniqueness within the warehouse
        var nameExists = await _db.WarehouseLocations.AnyAsync(
            l => l.WarehouseId == id && l.Name == body.Name.Trim(), ct);
        if (nameExists)
            return Conflict(Error("LOCATION_NAME_CONFLICT",
                $"Location '{body.Name}' already exists in this warehouse."));

        WarehouseLocation location;
        try
        {
            location = WarehouseLocation.Create(id, body.Name, body.Barcode);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.WarehouseLocations.Add(location);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Location created: {LocationId} Name={Name} Warehouse={WarehouseId}",
            location.Id, location.Name, id);

        return StatusCode(201, location);
    }

    // ── GET /inventory/levels ─────────────────────────────────────────────────

    [HttpGet("inventory/levels")]
    public async Task<IActionResult> GetInventoryLevels(
        [FromQuery] Guid? productId,
        [FromQuery] Guid? warehouseId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _db.InventoryLevels.AsNoTracking();

        if (productId.HasValue)
            query = query.Where(il => il.ProductId == productId.Value);

        if (warehouseId.HasValue)
            query = query.Where(il =>
                _db.WarehouseLocations
                    .Where(l => l.WarehouseId == warehouseId.Value)
                    .Select(l => l.Id)
                    .Contains(il.LocationId));

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(il => il.ProductId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(il => new
            {
                il.Id,
                il.OrgId,
                il.ProductId,
                ProductName = _db.Products
                    .Where(p => p.Id == il.ProductId)
                    .Select(p => p.Name)
                    .FirstOrDefault(),
                ProductSku = _db.Products
                    .Where(p => p.Id == il.ProductId)
                    .Select(p => p.Sku)
                    .FirstOrDefault(),
                il.LocationId,
                LocationName = _db.WarehouseLocations
                    .Where(l => l.Id == il.LocationId)
                    .Select(l => l.Name)
                    .FirstOrDefault(),
                WarehouseId = _db.WarehouseLocations
                    .Where(l => l.Id == il.LocationId)
                    .Select(l => l.WarehouseId)
                    .FirstOrDefault(),
                il.QuantityOnHand,
                il.QuantityReserved,
                il.QuantityAvailable,
                il.UpdatedAt,
            })
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    // ── POST /inventory/transfer ──────────────────────────────────────────────

    [HttpPost("inventory/transfer")]
    public async Task<IActionResult> TransferStock(
        [FromBody] StockTransferRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (body.Quantity <= 0)
            return BadRequest(Error("VALIDATION_ERROR", "Transfer quantity must be greater than zero."));

        if (body.FromLocationId == body.ToLocationId)
            return BadRequest(Error("VALIDATION_ERROR", "Source and destination locations must differ."));

        // Validate locations exist
        var fromLocation = await _db.WarehouseLocations.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == body.FromLocationId, ct);
        if (fromLocation is null)
            return UnprocessableEntity(Error("LOCATION_NOT_FOUND",
                $"Source location '{body.FromLocationId}' not found."));

        var toLocation = await _db.WarehouseLocations.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == body.ToLocationId, ct);
        if (toLocation is null)
            return UnprocessableEntity(Error("LOCATION_NOT_FOUND",
                $"Destination location '{body.ToLocationId}' not found."));

        // Get or fail on source inventory level
        var sourceLevel = await _db.InventoryLevels
            .FirstOrDefaultAsync(il =>
                il.ProductId == body.ProductId && il.LocationId == body.FromLocationId, ct);

        if (sourceLevel is null || sourceLevel.QuantityAvailable < body.Quantity)
            return UnprocessableEntity(Error("INSUFFICIENT_STOCK",
                $"Insufficient available stock at source location. Available: {sourceLevel?.QuantityAvailable ?? 0}."));

        // Get or create destination inventory level
        var destLevel = await _db.InventoryLevels
            .FirstOrDefaultAsync(il =>
                il.ProductId == body.ProductId && il.LocationId == body.ToLocationId, ct);

        if (destLevel is null)
        {
            destLevel = InventoryLevel.Create(orgId, body.ProductId, body.ToLocationId, 0);
            _db.InventoryLevels.Add(destLevel);
        }

        try
        {
            sourceLevel.Adjust(-body.Quantity);
            destLevel.Adjust(body.Quantity);
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("STOCK_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Stock transferred: product={ProductId} qty={Qty} from={FromLocation} to={ToLocation}",
            body.ProductId, body.Quantity, body.FromLocationId, body.ToLocationId);

        return Ok(new
        {
            ProductId = body.ProductId,
            Quantity = body.Quantity,
            FromLocationId = body.FromLocationId,
            ToLocationId = body.ToLocationId,
            Source = new
            {
                sourceLevel.LocationId,
                sourceLevel.QuantityOnHand,
                sourceLevel.QuantityAvailable,
            },
            Destination = new
            {
                destLevel.LocationId,
                destLevel.QuantityOnHand,
                destLevel.QuantityAvailable,
            },
            TransferredAt = DateTime.UtcNow,
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static object Error(string code, string message) =>
        new { error = new { code, message } };
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record CreateWarehouseRequest(string Name, string? Address);

public record CreateLocationRequest(string Name, string? Barcode);

public record StockTransferRequest(
    Guid ProductId,
    Guid FromLocationId,
    Guid ToLocationId,
    decimal Quantity);
