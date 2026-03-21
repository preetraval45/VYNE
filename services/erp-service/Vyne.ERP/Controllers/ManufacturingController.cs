using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Manufacturing;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Controllers;

[ApiController]
[Authorize]
[Route("manufacturing")]
public class ManufacturingController : ControllerBase
{
    private readonly ERPDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ILogger<ManufacturingController> _logger;

    public ManufacturingController(ERPDbContext db, ITenantContext tenant, ILogger<ManufacturingController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /manufacturing/bom ────────────────────────────────────────────────

    [HttpGet("bom")]
    public async Task<IActionResult> ListBoms(
        [FromQuery] Guid? productId,
        [FromQuery] bool? active,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _db.BillsOfMaterials.AsNoTracking();

        if (productId.HasValue)
            query = query.Where(b => b.ProductId == productId.Value);
        if (active.HasValue)
            query = query.Where(b => b.IsActive == active.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new
            {
                b.Id,
                b.OrgId,
                b.ProductId,
                ProductName = _db.Products
                    .Where(p => p.Id == b.ProductId)
                    .Select(p => p.Name)
                    .FirstOrDefault(),
                b.Version,
                b.IsActive,
                b.Notes,
                b.CreatedAt,
                ComponentCount = b.Components.Count,
            })
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    // ── POST /manufacturing/bom ───────────────────────────────────────────────

    [HttpPost("bom")]
    public async Task<IActionResult> CreateBom([FromBody] CreateBomRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        // Validate product exists
        var product = await _db.Products.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == body.ProductId, ct);
        if (product is null)
            return UnprocessableEntity(Error("PRODUCT_NOT_FOUND", $"Product '{body.ProductId}' not found."));

        BillOfMaterials bom;
        try
        {
            bom = BillOfMaterials.Create(orgId, body.ProductId, body.Version ?? "1.0", body.Notes);

            if (body.Components is not null)
            {
                foreach (var c in body.Components)
                {
                    var compProduct = await _db.Products.AsNoTracking()
                        .FirstOrDefaultAsync(p => p.Id == c.ComponentProductId, ct);
                    if (compProduct is null)
                        return UnprocessableEntity(Error("PRODUCT_NOT_FOUND",
                            $"Component product '{c.ComponentProductId}' not found."));

                    bom.AddComponent(c.ComponentProductId, c.Quantity, c.UnitOfMeasure ?? "pcs");
                }
            }
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.BillsOfMaterials.Add(bom);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("BOM created: {BomId} for product {ProductId} OrgId={OrgId}",
            bom.Id, bom.ProductId, orgId);

        return CreatedAtAction(nameof(GetBom), new { id = bom.Id }, await GetBomDetail(bom.Id, ct));
    }

    // ── GET /manufacturing/bom/{id} ───────────────────────────────────────────

    [HttpGet("bom/{id:guid}")]
    public async Task<IActionResult> GetBom(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var result = await GetBomDetail(id, ct);
        if (result is null)
            return NotFound(Error("NOT_FOUND", $"BOM '{id}' not found."));

        return Ok(result);
    }

    // ── POST /manufacturing/bom/{id}/components ───────────────────────────────

    [HttpPost("bom/{id:guid}/components")]
    public async Task<IActionResult> AddComponent(Guid id, [FromBody] BomComponentRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var bom = await _db.BillsOfMaterials
            .Include(b => b.Components)
            .FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bom is null)
            return NotFound(Error("NOT_FOUND", $"BOM '{id}' not found."));

        var compProduct = await _db.Products.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == body.ComponentProductId, ct);
        if (compProduct is null)
            return UnprocessableEntity(Error("PRODUCT_NOT_FOUND",
                $"Component product '{body.ComponentProductId}' not found."));

        try
        {
            bom.AddComponent(body.ComponentProductId, body.Quantity, body.UnitOfMeasure ?? "pcs");
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Component added to BOM {BomId}: product={ProductId}", id, body.ComponentProductId);

        return Ok(await GetBomDetail(id, ct));
    }

    // ── DELETE /manufacturing/bom/{id}/components/{componentId} ──────────────

    [HttpDelete("bom/{id:guid}/components/{componentId:guid}")]
    public async Task<IActionResult> RemoveComponent(Guid id, Guid componentId, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var bom = await _db.BillsOfMaterials
            .Include(b => b.Components)
            .FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bom is null)
            return NotFound(Error("NOT_FOUND", $"BOM '{id}' not found."));

        try
        {
            bom.RemoveComponent(componentId);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(Error("NOT_FOUND", ex.Message));
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Component {ComponentId} removed from BOM {BomId}", componentId, id);

        return NoContent();
    }

    // ── GET /manufacturing/work-orders ────────────────────────────────────────

    [HttpGet("work-orders")]
    public async Task<IActionResult> ListWorkOrders(
        [FromQuery] WorkOrderStatus? status,
        [FromQuery] Guid? productId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _db.WorkOrders.AsNoTracking();

        if (status.HasValue)
            query = query.Where(w => w.Status == status.Value);
        if (productId.HasValue)
            query = query.Where(w => w.ProductId == productId.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(w => w.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(w => new
            {
                w.Id,
                w.OrgId,
                w.WorkOrderNumber,
                w.ProductId,
                ProductName = _db.Products
                    .Where(p => p.Id == w.ProductId)
                    .Select(p => p.Name)
                    .FirstOrDefault(),
                w.BomId,
                w.QuantityToProduce,
                w.QuantityProduced,
                w.Status,
                w.ScheduledStart,
                w.ScheduledEnd,
                w.ActualStart,
                w.ActualEnd,
                w.Notes,
                w.CreatedAt,
                w.UpdatedAt,
            })
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    // ── POST /manufacturing/work-orders ───────────────────────────────────────

    [HttpPost("work-orders")]
    public async Task<IActionResult> CreateWorkOrder([FromBody] CreateWorkOrderRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.WorkOrderNumber))
            return BadRequest(Error("VALIDATION_ERROR", "Work order number is required."));

        // Check uniqueness
        var exists = await _db.WorkOrders.AnyAsync(w => w.WorkOrderNumber == body.WorkOrderNumber.Trim(), ct);
        if (exists)
            return Conflict(Error("WORK_ORDER_NUMBER_CONFLICT",
                $"Work order number '{body.WorkOrderNumber}' already exists."));

        // Validate product and BOM
        var product = await _db.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == body.ProductId, ct);
        if (product is null)
            return UnprocessableEntity(Error("PRODUCT_NOT_FOUND", $"Product '{body.ProductId}' not found."));

        var bom = await _db.BillsOfMaterials.AsNoTracking().FirstOrDefaultAsync(b => b.Id == body.BomId, ct);
        if (bom is null)
            return UnprocessableEntity(Error("BOM_NOT_FOUND", $"BOM '{body.BomId}' not found."));

        WorkOrder workOrder;
        try
        {
            workOrder = WorkOrder.Create(
                orgId,
                body.WorkOrderNumber,
                body.ProductId,
                body.BomId,
                body.QuantityToProduce,
                body.ScheduledStart,
                body.ScheduledEnd,
                body.Notes);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.WorkOrders.Add(workOrder);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Work order created: {WorkOrderId} #{Number} OrgId={OrgId}",
            workOrder.Id, workOrder.WorkOrderNumber, orgId);

        return CreatedAtAction(nameof(GetWorkOrder), new { id = workOrder.Id }, workOrder);
    }

    // ── GET /manufacturing/work-orders/{id} ───────────────────────────────────

    [HttpGet("work-orders/{id:guid}")]
    public async Task<IActionResult> GetWorkOrder(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var wo = await _db.WorkOrders.AsNoTracking().FirstOrDefaultAsync(w => w.Id == id, ct);
        if (wo is null)
            return NotFound(Error("NOT_FOUND", $"Work order '{id}' not found."));

        return Ok(wo);
    }

    // ── PATCH /manufacturing/work-orders/{id}/start ───────────────────────────

    [HttpPatch("work-orders/{id:guid}/start")]
    public async Task<IActionResult> StartWorkOrder(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var workOrder = await _db.WorkOrders.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (workOrder is null)
            return NotFound(Error("NOT_FOUND", $"Work order '{id}' not found."));

        try
        {
            workOrder.Start();
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("WORK_ORDER_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Work order started: {WorkOrderId} #{Number}", id, workOrder.WorkOrderNumber);

        return Ok(workOrder);
    }

    // ── PATCH /manufacturing/work-orders/{id}/complete ────────────────────────

    [HttpPatch("work-orders/{id:guid}/complete")]
    public async Task<IActionResult> CompleteWorkOrder(
        Guid id,
        [FromBody] CompleteWorkOrderRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var workOrder = await _db.WorkOrders.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (workOrder is null)
            return NotFound(Error("NOT_FOUND", $"Work order '{id}' not found."));

        try
        {
            workOrder.Complete(body.QuantityProduced);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return UnprocessableEntity(Error("WORK_ORDER_ERROR", ex.Message));
        }

        // Add completed stock to the product's inventory
        var product = await _db.Products.FirstOrDefaultAsync(p => p.Id == workOrder.ProductId, ct);
        if (product is not null)
        {
            try
            {
                product.AdjustStock((int)body.QuantityProduced,
                    $"Manufacturing work order completed: {workOrder.WorkOrderNumber}");
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Stock adjustment failed for work order {WorkOrderId}: {Message}", id, ex.Message);
            }
        }
        else
        {
            _logger.LogWarning("Product {ProductId} not found during stock update for work order {WorkOrderId}",
                workOrder.ProductId, id);
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Work order completed: {WorkOrderId} qty={Qty}", id, body.QuantityProduced);

        return Ok(workOrder);
    }

    // ── PATCH /manufacturing/work-orders/{id}/cancel ──────────────────────────

    [HttpPatch("work-orders/{id:guid}/cancel")]
    public async Task<IActionResult> CancelWorkOrder(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var workOrder = await _db.WorkOrders.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (workOrder is null)
            return NotFound(Error("NOT_FOUND", $"Work order '{id}' not found."));

        try
        {
            workOrder.Cancel();
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("WORK_ORDER_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Work order cancelled: {WorkOrderId}", id);

        return Ok(workOrder);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<object?> GetBomDetail(Guid id, CancellationToken ct)
    {
        return await _db.BillsOfMaterials
            .AsNoTracking()
            .Where(b => b.Id == id)
            .Select(b => new
            {
                b.Id,
                b.OrgId,
                b.ProductId,
                ProductName = _db.Products
                    .Where(p => p.Id == b.ProductId)
                    .Select(p => p.Name)
                    .FirstOrDefault(),
                b.Version,
                b.IsActive,
                b.Notes,
                b.CreatedAt,
                Components = b.Components.Select(c => new
                {
                    c.Id,
                    c.BomId,
                    c.ComponentProductId,
                    ComponentProductName = _db.Products
                        .Where(p => p.Id == c.ComponentProductId)
                        .Select(p => p.Name)
                        .FirstOrDefault(),
                    c.Quantity,
                    c.UnitOfMeasure,
                    c.Notes,
                }).ToList(),
            })
            .FirstOrDefaultAsync(ct);
    }

    private static object Error(string code, string message) =>
        new { error = new { code, message } };
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record CreateBomRequest(
    Guid ProductId,
    string? Version,
    string? Notes,
    List<BomComponentRequest>? Components);

public record BomComponentRequest(
    Guid ComponentProductId,
    decimal Quantity,
    string? UnitOfMeasure);

public record CreateWorkOrderRequest(
    string WorkOrderNumber,
    Guid ProductId,
    Guid BomId,
    decimal QuantityToProduce,
    DateTime? ScheduledStart,
    DateTime? ScheduledEnd,
    string? Notes);

public record CompleteWorkOrderRequest(decimal QuantityProduced);
