using Amazon.EventBridge;
using Amazon.EventBridge.Model;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Vyne.ERP.Domain.Inventory;
using Vyne.ERP.Domain.Orders;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Infrastructure.Services;

/// <summary>
/// Background service that runs every hour and automatically triggers purchase order
/// drafts when product stock falls at or below the configured reorder threshold.
/// </summary>
public class ReorderService : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(1);
    private static readonly TimeSpan TriggerCooldown = TimeSpan.FromHours(24);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReorderService> _logger;

    public ReorderService(IServiceScopeFactory scopeFactory, ILogger<ReorderService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ReorderService started — checking every {Interval}", CheckInterval);

        // Small delay on startup so the application is fully ready
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCheckAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in ReorderService check cycle");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }

        _logger.LogInformation("ReorderService stopped.");
    }

    private async Task RunCheckAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ERPDbContext>();
        var eventBridgeFactory = scope.ServiceProvider.GetService<IAmazonEventBridge>();

        _logger.LogInformation("ReorderService: Starting inventory check at {Time}", DateTime.UtcNow);

        // Load all active rules — bypass query filter by using explicit OrgId filter
        var rules = await db.ReorderRules
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(r => r.IsActive)
            .ToListAsync(ct);

        if (rules.Count == 0)
        {
            _logger.LogDebug("ReorderService: No active reorder rules found.");
            return;
        }

        // Load settings per org to check if auto-reorder is enabled
        var orgIds = rules.Select(r => r.OrgId).Distinct().ToList();
        var orgSettings = await db.OrgSettings
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(s => orgIds.Contains(s.OrgId))
            .ToDictionaryAsync(s => s.OrgId, ct);

        // Load relevant products
        var productIds = rules.Select(r => r.ProductId).Distinct().ToList();
        var products = await db.Products
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(p => productIds.Contains(p.Id) && p.IsActive)
            .ToDictionaryAsync(p => p.Id, ct);

        var triggeredCount = 0;

        foreach (var rule in rules)
        {
            // Skip if org has auto-reorder disabled
            if (orgSettings.TryGetValue(rule.OrgId, out var settings) && !settings.AutoReorder)
                continue;

            if (!products.TryGetValue(rule.ProductId, out var product))
                continue;

            // Check if we should trigger (stock at or below threshold, and cooldown passed)
            var currentStock = (decimal)product.StockQuantity;
            if (!rule.ShouldTrigger(currentStock))
                continue;

            // Respect 24-hour cooldown
            if (rule.LastTriggeredAt.HasValue &&
                (DateTime.UtcNow - rule.LastTriggeredAt.Value) < TriggerCooldown)
            {
                _logger.LogDebug(
                    "ReorderService: Rule {RuleId} cooldown active for product {Sku}",
                    rule.Id, product.Sku);
                continue;
            }

            // ── Create draft purchase order ────────────────────────────────────

            try
            {
                var orderQty = rule.GetOrderQuantity(currentStock);
                await CreatePurchaseOrderDraftAsync(db, rule, product, orderQty, settings, ct);

                // Update LastTriggeredAt — need tracking version
                var trackedRule = await db.ReorderRules
                    .IgnoreQueryFilters()
                    .FirstAsync(r => r.Id == rule.Id, ct);
                trackedRule.Trigger();
                await db.SaveChangesAsync(ct);

                triggeredCount++;

                _logger.LogInformation(
                    "Auto-reorder triggered for {ProductSku} (qty={Qty}, stock={Stock}, min={Min}) OrgId={OrgId}",
                    product.Sku, orderQty, currentStock, rule.MinQty, rule.OrgId);

                // ── Publish EventBridge event ──────────────────────────────────
                if (eventBridgeFactory != null)
                {
                    await PublishReorderEventAsync(
                        eventBridgeFactory, rule, product, orderQty, currentStock, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "ReorderService: Failed to process reorder for product {Sku} rule {RuleId}",
                    product.Sku, rule.Id);
            }
        }

        _logger.LogInformation(
            "ReorderService: Check complete — {Triggered}/{Total} rules triggered",
            triggeredCount, rules.Count);
    }

    private static async Task CreatePurchaseOrderDraftAsync(
        ERPDbContext db,
        ReorderRule rule,
        Product product,
        decimal orderQty,
        Domain.Settings.OrgSettings? settings,
        CancellationToken ct)
    {
        // Generate order number from settings (or fallback)
        string orderNumber;
        if (settings != null)
        {
            // Load tracked settings to increment counter
            var trackedSettings = await db.OrgSettings
                .IgnoreQueryFilters()
                .FirstAsync(s => s.OrgId == rule.OrgId, ct);
            orderNumber = trackedSettings.GenerateOrderNumber();
            trackedSettings.IncrementOrderNumber();
        }
        else
        {
            orderNumber = $"AUTO-{DateTime.UtcNow:yyyyMMddHHmmss}-{product.Sku}";
        }

        var order = Order.Create(
            orgId: rule.OrgId,
            orderNumber: orderNumber,
            type: OrderType.Purchase,
            supplierId: rule.SupplierId,
            notes: $"Auto-generated reorder for {product.Name} (SKU: {product.Sku}). " +
                   $"Stock was {(int)Math.Floor(product.StockQuantity)} units (threshold: {rule.MinQty}).");

        order.AddLine(
            productId: product.Id,
            productName: product.Name,
            quantity: (int)Math.Ceiling(orderQty),
            unitPrice: product.CostPrice);

        db.Orders.Add(order);
    }

    private static async Task PublishReorderEventAsync(
        IAmazonEventBridge eventBridge,
        ReorderRule rule,
        Product product,
        decimal orderQty,
        decimal currentStock,
        CancellationToken ct)
    {
        var detail = JsonSerializer.Serialize(new
        {
            eventType = "inventory.reorder_triggered",
            orgId = rule.OrgId,
            ruleId = rule.Id,
            productId = rule.ProductId,
            productSku = product.Sku,
            productName = product.Name,
            currentStock,
            minQty = rule.MinQty,
            orderQty,
            supplierId = rule.SupplierId,
            triggeredAt = DateTime.UtcNow,
        });

        var request = new PutEventsRequest
        {
            Entries =
            [
                new PutEventsRequestEntry
                {
                    Source = "vyne.erp",
                    DetailType = "inventory.reorder_triggered",
                    Detail = detail,
                    EventBusName = "vyne-events",
                }
            ]
        };

        try
        {
            await eventBridge.PutEventsAsync(request, ct);
        }
        catch (Exception ex)
        {
            // Log but do not fail the reorder — event publishing is best-effort
            Console.Error.WriteLine($"[ReorderService] EventBridge publish failed: {ex.Message}");
        }
    }
}
