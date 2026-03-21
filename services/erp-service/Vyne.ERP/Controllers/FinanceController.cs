using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Orders;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Controllers;

[ApiController]
[Authorize]
[Route("finance")]
public class FinanceController : ControllerBase
{
    private readonly ERPDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ILogger<FinanceController> _logger;

    public FinanceController(ERPDbContext db, ITenantContext tenant, ILogger<FinanceController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /finance/summary ──────────────────────────────────────────────────
    // Revenue  = sum of Delivered sale orders this calendar month
    // Expenses = sum of Delivered purchase orders this calendar month
    // Gross profit = revenue - expenses (before tax)

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int? year,
        [FromQuery] int? month,
        CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var now = DateTime.UtcNow;
        var targetYear = year ?? now.Year;
        var targetMonth = month ?? now.Month;

        if (targetMonth < 1 || targetMonth > 12)
            return BadRequest(Error("VALIDATION_ERROR", "Month must be between 1 and 12."));

        var periodStart = new DateTime(targetYear, targetMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var periodEnd = periodStart.AddMonths(1);

        var deliveredOrders = await _db.Orders
            .AsNoTracking()
            .Where(o =>
                o.Status == OrderStatus.Delivered &&
                o.DeliveredAt >= periodStart &&
                o.DeliveredAt < periodEnd)
            .Select(o => new { o.Type, o.Subtotal, o.TaxAmount, o.TotalAmount })
            .ToListAsync(ct);

        var revenue = deliveredOrders
            .Where(o => o.Type == OrderType.Sale)
            .Sum(o => o.Subtotal);

        var revenueTax = deliveredOrders
            .Where(o => o.Type == OrderType.Sale)
            .Sum(o => o.TaxAmount);

        var expenses = deliveredOrders
            .Where(o => o.Type == OrderType.Purchase)
            .Sum(o => o.Subtotal);

        var grossProfit = revenue - expenses;
        var grossMargin = revenue > 0 ? Math.Round(grossProfit / revenue * 100, 2) : 0m;

        // Count orders by type
        var saleOrderCount = deliveredOrders.Count(o => o.Type == OrderType.Sale);
        var purchaseOrderCount = deliveredOrders.Count(o => o.Type == OrderType.Purchase);

        // Inventory value snapshot
        var inventoryValue = await _db.Products
            .AsNoTracking()
            .Where(p => p.IsActive)
            .SumAsync(p => (decimal)p.StockQuantity * p.CostPrice, ct);

        // Low stock alerts count
        var lowStockCount = await _db.Products
            .AsNoTracking()
            .CountAsync(p => p.IsActive && p.StockQuantity <= p.ReorderPoint, ct);

        return Ok(new
        {
            Period = new { Year = targetYear, Month = targetMonth, Label = periodStart.ToString("MMMM yyyy") },
            Revenue = new
            {
                Subtotal = revenue,
                Tax = revenueTax,
                Total = revenue + revenueTax,
                OrderCount = saleOrderCount,
            },
            Expenses = new
            {
                Subtotal = expenses,
                OrderCount = purchaseOrderCount,
            },
            GrossProfit = grossProfit,
            GrossMarginPercent = grossMargin,
            Inventory = new
            {
                TotalValue = inventoryValue,
                LowStockProductCount = lowStockCount,
            },
            GeneratedAt = DateTime.UtcNow,
        });
    }

    // ── GET /finance/orders-by-month ──────────────────────────────────────────
    // Monthly order totals for the last 6 months (delivered orders only)

    [HttpGet("orders-by-month")]
    public async Task<IActionResult> GetOrdersByMonth(
        [FromQuery] int months = 6,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (months < 1 || months > 24) months = 6;

        var now = DateTime.UtcNow;
        // Start from the beginning of the month N months ago
        var cutoff = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc)
            .AddMonths(-(months - 1));

        var orders = await _db.Orders
            .AsNoTracking()
            .Where(o =>
                o.Status == OrderStatus.Delivered &&
                o.DeliveredAt >= cutoff)
            .Select(o => new
            {
                o.Type,
                o.Subtotal,
                o.TotalAmount,
                DeliveredAt = o.DeliveredAt!.Value,
            })
            .ToListAsync(ct);

        // Build monthly buckets for all N months (including months with 0 orders)
        var result = Enumerable.Range(0, months)
            .Select(i =>
            {
                var bucketDate = cutoff.AddMonths(i);
                var bucketYear = bucketDate.Year;
                var bucketMonth = bucketDate.Month;

                var monthOrders = orders.Where(o =>
                    o.DeliveredAt.Year == bucketYear &&
                    o.DeliveredAt.Month == bucketMonth).ToList();

                var saleSubtotal = monthOrders
                    .Where(o => o.Type == OrderType.Sale)
                    .Sum(o => o.Subtotal);

                var purchaseSubtotal = monthOrders
                    .Where(o => o.Type == OrderType.Purchase)
                    .Sum(o => o.Subtotal);

                return new
                {
                    Year = bucketYear,
                    Month = bucketMonth,
                    Label = bucketDate.ToString("MMM yyyy"),
                    Revenue = saleSubtotal,
                    Expenses = purchaseSubtotal,
                    GrossProfit = saleSubtotal - purchaseSubtotal,
                    OrderCount = monthOrders.Count,
                    SaleOrderCount = monthOrders.Count(o => o.Type == OrderType.Sale),
                    PurchaseOrderCount = monthOrders.Count(o => o.Type == OrderType.Purchase),
                };
            })
            .ToList();

        return Ok(new
        {
            Months = months,
            Data = result,
            Totals = new
            {
                Revenue = result.Sum(r => r.Revenue),
                Expenses = result.Sum(r => r.Expenses),
                GrossProfit = result.Sum(r => r.GrossProfit),
                OrderCount = result.Sum(r => r.OrderCount),
            },
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static object Error(string code, string message) =>
        new { error = new { code, message } };
}
