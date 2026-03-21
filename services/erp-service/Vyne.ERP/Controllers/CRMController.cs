using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.CRM;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Controllers;

[ApiController]
[Authorize]
[Route("crm")]
public class CRMController : ControllerBase
{
    private readonly ERPDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ILogger<CRMController> _logger;

    public CRMController(ERPDbContext db, ITenantContext tenant, ILogger<CRMController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /crm/customers ────────────────────────────────────────────────────

    [HttpGet("customers")]
    public async Task<IActionResult> ListCustomers(
        [FromQuery] CustomerStatus? status,
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

        var query = _db.Customers.AsNoTracking();

        if (status.HasValue)
            query = query.Where(c => c.Status == status.Value);

        if (active.HasValue)
            query = query.Where(c => c.IsActive == active.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(s) ||
                (c.Email != null && c.Email.ToLower().Contains(s)) ||
                (c.Company != null && c.Company.ToLower().Contains(s)));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.OrgId,
                c.Name,
                c.Email,
                c.Phone,
                c.Company,
                c.Status,
                c.TotalRevenue,
                c.IsActive,
                c.CreatedAt,
                c.UpdatedAt,
                OrderCount = _db.Orders
                    .Count(o => o.CustomerId == c.Id),
            })
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    // ── POST /crm/customers ───────────────────────────────────────────────────

    [HttpPost("customers")]
    public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(Error("VALIDATION_ERROR", "Customer name is required."));

        Customer customer;
        try
        {
            customer = Customer.Create(orgId, body.Name, body.Email, body.Phone, body.Company);

            if (body.Status.HasValue || body.Notes is not null)
                customer.Update(status: body.Status, notes: body.Notes);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Customer created: {CustomerId} Name={Name} OrgId={OrgId}",
            customer.Id, customer.Name, orgId);

        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, customer);
    }

    // ── GET /crm/customers/{id} ───────────────────────────────────────────────

    [HttpGet("customers/{id:guid}")]
    public async Task<IActionResult> GetCustomer(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var customer = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        if (customer is null)
            return NotFound(Error("NOT_FOUND", $"Customer '{id}' not found."));

        // Order history summary
        var orders = await _db.Orders
            .AsNoTracking()
            .Where(o => o.CustomerId == id)
            .OrderByDescending(o => o.CreatedAt)
            .Take(20)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.Status,
                o.Subtotal,
                o.TotalAmount,
                o.CreatedAt,
                o.DeliveredAt,
            })
            .ToListAsync(ct);

        var orderStats = await _db.Orders
            .AsNoTracking()
            .Where(o => o.CustomerId == id)
            .GroupBy(o => true)
            .Select(g => new
            {
                TotalOrders = g.Count(),
                TotalRevenue = g.Sum(o => o.TotalAmount),
                DeliveredOrders = g.Count(o => o.Status == Domain.Orders.OrderStatus.Delivered),
            })
            .FirstOrDefaultAsync(ct);

        return Ok(new
        {
            customer.Id,
            customer.OrgId,
            customer.Name,
            customer.Email,
            customer.Phone,
            customer.Company,
            customer.Status,
            customer.TotalRevenue,
            customer.Notes,
            customer.IsActive,
            customer.CreatedAt,
            customer.UpdatedAt,
            OrderHistory = new
            {
                TotalOrders = orderStats?.TotalOrders ?? 0,
                TotalRevenue = orderStats?.TotalRevenue ?? 0,
                DeliveredOrders = orderStats?.DeliveredOrders ?? 0,
                RecentOrders = orders,
            },
        });
    }

    // ── PATCH /crm/customers/{id} ─────────────────────────────────────────────

    [HttpPatch("customers/{id:guid}")]
    public async Task<IActionResult> UpdateCustomer(
        Guid id,
        [FromBody] UpdateCustomerRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (customer is null)
            return NotFound(Error("NOT_FOUND", $"Customer '{id}' not found."));

        try
        {
            customer.Update(
                name: body.Name,
                email: body.Email,
                phone: body.Phone,
                company: body.Company,
                status: body.Status,
                notes: body.Notes);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Customer updated: {CustomerId}", id);

        return Ok(customer);
    }

    // ── DELETE /crm/customers/{id} ────────────────────────────────────────────

    [HttpDelete("customers/{id:guid}")]
    public async Task<IActionResult> DeactivateCustomer(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (customer is null)
            return NotFound(Error("NOT_FOUND", $"Customer '{id}' not found."));

        if (!customer.IsActive)
            return Ok(new { message = "Customer is already deactivated.", customer.Id });

        customer.Deactivate();
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Customer deactivated: {CustomerId}", id);
        return Ok(new { message = "Customer deactivated.", customer.Id });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static object Error(string code, string message) =>
        new { error = new { code, message } };
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record CreateCustomerRequest(
    string Name,
    string? Email,
    string? Phone,
    string? Company,
    CustomerStatus? Status,
    string? Notes);

public record UpdateCustomerRequest(
    string? Name,
    string? Email,
    string? Phone,
    string? Company,
    CustomerStatus? Status,
    string? Notes);
