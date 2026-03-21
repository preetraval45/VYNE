using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Orders;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Controllers;

[ApiController]
[Authorize]
[Route("orders")]
public class OrdersController : ControllerBase
{
    private readonly ERPDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(ERPDbContext db, ITenantContext tenant, ILogger<OrdersController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /orders ───────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> ListOrders(
        [FromQuery] OrderType? type,
        [FromQuery] OrderStatus? status,
        [FromQuery] Guid? customerId,
        [FromQuery] Guid? supplierId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _db.Orders.AsNoTracking();

        if (type.HasValue)
            query = query.Where(o => o.Type == type.Value);
        if (status.HasValue)
            query = query.Where(o => o.Status == status.Value);
        if (customerId.HasValue)
            query = query.Where(o => o.CustomerId == customerId.Value);
        if (supplierId.HasValue)
            query = query.Where(o => o.SupplierId == supplierId.Value);
        if (from.HasValue)
            query = query.Where(o => o.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(o => o.CreatedAt <= to.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.Type,
                o.Status,
                o.CustomerId,
                o.SupplierId,
                o.Subtotal,
                o.TaxAmount,
                o.TotalAmount,
                o.Notes,
                o.ShippedAt,
                o.DeliveredAt,
                o.CreatedAt,
                o.UpdatedAt,
                LineCount = o.Lines.Count,
            })
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    // ── POST /orders ──────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.OrderNumber))
            return BadRequest(Error("VALIDATION_ERROR", "Order number is required."));
        if (body.Lines is null || body.Lines.Count == 0)
            return BadRequest(Error("VALIDATION_ERROR", "At least one order line is required."));

        // Check order number uniqueness
        var exists = await _db.Orders.AnyAsync(o => o.OrderNumber == body.OrderNumber.Trim(), ct);
        if (exists)
            return Conflict(Error("ORDER_NUMBER_CONFLICT", $"Order number '{body.OrderNumber}' already exists."));

        Order order;
        try
        {
            order = Order.Create(
                orgId,
                body.OrderNumber,
                body.Type,
                customerId: body.CustomerId,
                supplierId: body.SupplierId,
                notes: body.Notes);

            foreach (var line in body.Lines)
            {
                // Fetch product to get current price and name if not overridden
                var product = await _db.Products
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == line.ProductId, ct);

                if (product is null)
                    return UnprocessableEntity(Error("PRODUCT_NOT_FOUND",
                        $"Product '{line.ProductId}' not found."));

                var unitPrice = line.UnitPrice.HasValue && line.UnitPrice.Value >= 0
                    ? line.UnitPrice.Value
                    : (body.Type == OrderType.Sale ? product.SalePrice : product.CostPrice);

                order.AddLine(product.Id, product.Name, line.Quantity, unitPrice);
            }
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("ORDER_ERROR", ex.Message));
        }

        _db.Orders.Add(order);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Order created: {OrderId} #{OrderNumber} OrgId={OrgId}",
            order.Id, order.OrderNumber, orgId);

        var result = await GetOrderWithLines(order.Id, ct);
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, result);
    }

    // ── GET /orders/{id} ──────────────────────────────────────────────────────

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOrder(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var result = await GetOrderWithLines(id, ct);
        if (result is null)
            return NotFound(Error("NOT_FOUND", $"Order '{id}' not found."));

        return Ok(result);
    }

    // ── PATCH /orders/{id}/confirm ────────────────────────────────────────────

    [HttpPatch("{id:guid}/confirm")]
    public async Task<IActionResult> ConfirmOrder(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var order = await _db.Orders
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (order is null)
            return NotFound(Error("NOT_FOUND", $"Order '{id}' not found."));

        try
        {
            order.Confirm();
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("ORDER_ERROR", ex.Message));
        }

        // For sale orders: deduct inventory stock
        if (order.Type == OrderType.Sale)
        {
            foreach (var line in order.Lines)
            {
                var product = await _db.Products
                    .FirstOrDefaultAsync(p => p.Id == line.ProductId, ct);

                if (product is null)
                {
                    _logger.LogWarning("Product {ProductId} not found during stock deduction for order {OrderId}",
                        line.ProductId, id);
                    continue;
                }

                try
                {
                    product.AdjustStock(-line.Quantity, $"Sale order confirmed: {order.OrderNumber}");
                }
                catch (InvalidOperationException ex)
                {
                    _logger.LogWarning("Insufficient stock for product {ProductId} on order {OrderId}: {Message}",
                        line.ProductId, id, ex.Message);
                    // Continue with confirmation even if stock goes negative (backorder scenario)
                    // In production you may want to block this
                }
            }
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Order confirmed: {OrderId} #{OrderNumber}", order.Id, order.OrderNumber);
        return Ok(await GetOrderWithLines(id, ct));
    }

    // ── PATCH /orders/{id}/ship ────────────────────────────────────────────────

    [HttpPatch("{id:guid}/ship")]
    public async Task<IActionResult> ShipOrder(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null)
            return NotFound(Error("NOT_FOUND", $"Order '{id}' not found."));

        try
        {
            order.Ship();
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("ORDER_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Order shipped: {OrderId} #{OrderNumber}", order.Id, order.OrderNumber);
        return Ok(await GetOrderWithLines(id, ct));
    }

    // ── PATCH /orders/{id}/deliver ─────────────────────────────────────────────

    [HttpPatch("{id:guid}/deliver")]
    public async Task<IActionResult> DeliverOrder(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (order is null)
            return NotFound(Error("NOT_FOUND", $"Order '{id}' not found."));

        try
        {
            order.Deliver();
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("ORDER_ERROR", ex.Message));
        }

        // For purchase orders: add received stock to inventory
        if (order.Type == OrderType.Purchase)
        {
            var linesWithProducts = await _db.Orders
                .AsNoTracking()
                .Where(o => o.Id == id)
                .SelectMany(o => o.Lines)
                .ToListAsync(ct);

            foreach (var line in linesWithProducts)
            {
                var product = await _db.Products
                    .FirstOrDefaultAsync(p => p.Id == line.ProductId, ct);

                if (product is null)
                {
                    _logger.LogWarning("Product {ProductId} not found during stock receipt for order {OrderId}",
                        line.ProductId, id);
                    continue;
                }

                product.AdjustStock(line.Quantity, $"Purchase order delivered: {order.OrderNumber}");
            }
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Order delivered: {OrderId} #{OrderNumber}", order.Id, order.OrderNumber);
        return Ok(await GetOrderWithLines(id, ct));
    }

    // ── PATCH /orders/{id}/cancel ─────────────────────────────────────────────

    [HttpPatch("{id:guid}/cancel")]
    public async Task<IActionResult> CancelOrder(Guid id, [FromBody] CancelOrderRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.Reason))
            return BadRequest(Error("VALIDATION_ERROR", "Cancellation reason is required."));

        var order = await _db.Orders
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id, ct);

        if (order is null)
            return NotFound(Error("NOT_FOUND", $"Order '{id}' not found."));

        var wasConfirmedOrLater = order.Status is OrderStatus.Confirmed
            or OrderStatus.Processing
            or OrderStatus.Shipped;

        try
        {
            order.Cancel(body.Reason);
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("ORDER_ERROR", ex.Message));
        }

        // For sale orders that had stock deducted (confirmed or later): restore inventory
        if (order.Type == OrderType.Sale && wasConfirmedOrLater)
        {
            foreach (var line in order.Lines)
            {
                var product = await _db.Products
                    .FirstOrDefaultAsync(p => p.Id == line.ProductId, ct);

                if (product is null)
                {
                    _logger.LogWarning("Product {ProductId} not found during stock restore for cancelled order {OrderId}",
                        line.ProductId, id);
                    continue;
                }

                product.AdjustStock(line.Quantity, $"Sale order cancelled: {order.OrderNumber}");
            }
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Order cancelled: {OrderId} #{OrderNumber} Reason={Reason}",
            order.Id, order.OrderNumber, body.Reason);

        return Ok(await GetOrderWithLines(id, ct));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<object?> GetOrderWithLines(Guid id, CancellationToken ct)
    {
        return await _db.Orders
            .AsNoTracking()
            .Where(o => o.Id == id)
            .Select(o => new
            {
                o.Id,
                o.OrgId,
                o.OrderNumber,
                o.Type,
                o.Status,
                o.CustomerId,
                o.SupplierId,
                o.Subtotal,
                o.TaxAmount,
                o.TotalAmount,
                o.Notes,
                o.CancellationReason,
                o.ShippedAt,
                o.DeliveredAt,
                o.CreatedAt,
                o.UpdatedAt,
                Lines = o.Lines.Select(l => new
                {
                    l.Id,
                    l.ProductId,
                    l.ProductName,
                    l.ProductSku,
                    l.Quantity,
                    l.UnitPrice,
                    l.LineTotal,
                }).ToList(),
            })
            .FirstOrDefaultAsync(ct);
    }

    private static object Error(string code, string message) =>
        new { error = new { code, message } };
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record CreateOrderRequest(
    string OrderNumber,
    OrderType Type,
    Guid? CustomerId,
    Guid? SupplierId,
    string? Notes,
    List<OrderLineRequest> Lines);

public record OrderLineRequest(
    Guid ProductId,
    int Quantity,
    decimal? UnitPrice);

public record CancelOrderRequest(string Reason);
