using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Accounting;
using Vyne.ERP.Domain.CRM;
using Vyne.ERP.Domain.Inventory;
using Vyne.ERP.Domain.Manufacturing;
using Vyne.ERP.Domain.Orders;
using Vyne.ERP.Domain.Warehouse;

namespace Vyne.ERP.Infrastructure.Data;

public class ERPDbContext : DbContext
{
    private readonly ITenantContext _tenant;

    public ERPDbContext(DbContextOptions<ERPDbContext> options, ITenantContext tenant)
        : base(options)
    {
        _tenant = tenant;
    }

    // ── Existing ──────────────────────────────────────────────────────────────
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();

    // ── Manufacturing ─────────────────────────────────────────────────────────
    public DbSet<BillOfMaterials> BillsOfMaterials => Set<BillOfMaterials>();
    public DbSet<BomComponent> BomComponents => Set<BomComponent>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();

    // ── Warehouse ─────────────────────────────────────────────────────────────
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<WarehouseLocation> WarehouseLocations => Set<WarehouseLocation>();
    public DbSet<InventoryLevel> InventoryLevels => Set<InventoryLevel>();

    // ── Accounting ────────────────────────────────────────────────────────────
    public DbSet<ChartOfAccount> ChartOfAccounts => Set<ChartOfAccount>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalLine> JournalLines => Set<JournalLine>();

    // ── CRM ───────────────────────────────────────────────────────────────────
    public DbSet<Customer> Customers => Set<Customer>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        base.OnModelCreating(m);

        // ── Product ───────────────────────────────────────────

        m.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasColumnName("id");
            e.Property(p => p.OrgId).HasColumnName("org_id");
            e.Property(p => p.Sku).HasColumnName("sku").HasMaxLength(100).IsRequired();
            e.Property(p => p.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            e.Property(p => p.Description).HasColumnName("description");
            e.Property(p => p.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(50);
            e.Property(p => p.CostPrice).HasColumnName("cost_price").HasColumnType("decimal(18,4)");
            e.Property(p => p.SalePrice).HasColumnName("sale_price").HasColumnType("decimal(18,4)");
            e.Property(p => p.StockQuantity).HasColumnName("stock_quantity").HasDefaultValue(0);
            e.Property(p => p.ReorderPoint).HasColumnName("reorder_point").HasDefaultValue(0);
            e.Property(p => p.ReorderQuantity).HasColumnName("reorder_quantity").HasDefaultValue(10);
            e.Property(p => p.SupplierId).HasColumnName("supplier_id");
            e.Property(p => p.Category).HasColumnName("category").HasMaxLength(100);
            e.Property(p => p.ImageUrl).HasColumnName("image_url").HasMaxLength(2048);
            e.Property(p => p.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(p => p.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            e.Property(p => p.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

            e.HasIndex(p => new { p.OrgId, p.Sku }).IsUnique();
            e.HasIndex(p => p.OrgId);
            e.HasIndex(p => new { p.OrgId, p.IsActive });
            e.HasIndex(p => new { p.OrgId, p.Category });

            e.HasQueryFilter(p => p.OrgId == (_tenant.OrgId ?? Guid.Empty));
        });

        // ── Supplier ──────────────────────────────────────────

        m.Entity<Supplier>(e =>
        {
            e.ToTable("suppliers");
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).HasColumnName("id");
            e.Property(s => s.OrgId).HasColumnName("org_id");
            e.Property(s => s.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            e.Property(s => s.Email).HasColumnName("email").HasMaxLength(255);
            e.Property(s => s.Phone).HasColumnName("phone").HasMaxLength(50);
            e.Property(s => s.Address).HasColumnName("address");
            e.Property(s => s.Website).HasColumnName("website").HasMaxLength(2048);
            e.Property(s => s.ContactPerson).HasColumnName("contact_person").HasMaxLength(255);
            e.Property(s => s.Notes).HasColumnName("notes");
            e.Property(s => s.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(s => s.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            e.Property(s => s.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

            e.HasIndex(s => s.OrgId);
            e.HasIndex(s => new { s.OrgId, s.IsActive });

            e.HasQueryFilter(s => s.OrgId == (_tenant.OrgId ?? Guid.Empty));
        });

        // ── Order ─────────────────────────────────────────────

        m.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.HasKey(o => o.Id);
            e.Property(o => o.Id).HasColumnName("id");
            e.Property(o => o.OrgId).HasColumnName("org_id");
            e.Property(o => o.OrderNumber).HasColumnName("order_number").HasMaxLength(100).IsRequired();
            e.Property(o => o.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(50);
            e.Property(o => o.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
            e.Property(o => o.CustomerId).HasColumnName("customer_id");
            e.Property(o => o.SupplierId).HasColumnName("supplier_id");
            e.Property(o => o.Subtotal).HasColumnName("subtotal").HasColumnType("decimal(18,4)");
            e.Property(o => o.TaxAmount).HasColumnName("tax_amount").HasColumnType("decimal(18,4)");
            e.Property(o => o.TotalAmount).HasColumnName("total_amount").HasColumnType("decimal(18,4)");
            e.Property(o => o.Notes).HasColumnName("notes");
            e.Property(o => o.CancellationReason).HasColumnName("cancellation_reason");
            e.Property(o => o.ShippedAt).HasColumnName("shipped_at");
            e.Property(o => o.DeliveredAt).HasColumnName("delivered_at");
            e.Property(o => o.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            e.Property(o => o.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

            e.HasIndex(o => new { o.OrgId, o.OrderNumber }).IsUnique();
            e.HasIndex(o => o.OrgId);
            e.HasIndex(o => new { o.OrgId, o.Status });
            e.HasIndex(o => new { o.OrgId, o.Type });
            e.HasIndex(o => new { o.OrgId, o.CreatedAt });

            e.HasMany(o => o.Lines)
             .WithOne()
             .HasForeignKey(l => l.OrderId)
             .OnDelete(DeleteBehavior.Cascade);

            // Map the private backing field for Lines collection
            e.Navigation(o => o.Lines).HasField("_lines").UsePropertyAccessMode(PropertyAccessMode.Field);

            e.HasQueryFilter(o => o.OrgId == (_tenant.OrgId ?? Guid.Empty));
        });

        // ── OrderLine ─────────────────────────────────────────

        m.Entity<OrderLine>(e =>
        {
            e.ToTable("order_lines");
            e.HasKey(l => l.Id);
            e.Property(l => l.Id).HasColumnName("id");
            e.Property(l => l.OrderId).HasColumnName("order_id");
            e.Property(l => l.ProductId).HasColumnName("product_id");
            e.Property(l => l.ProductName).HasColumnName("product_name").HasMaxLength(255).IsRequired();
            e.Property(l => l.ProductSku).HasColumnName("product_sku").HasMaxLength(100);
            e.Property(l => l.Quantity).HasColumnName("quantity");
            e.Property(l => l.UnitPrice).HasColumnName("unit_price").HasColumnType("decimal(18,4)");
            e.Ignore(l => l.LineTotal); // computed

            e.HasIndex(l => l.OrderId);
            e.HasIndex(l => l.ProductId);
        });

        // ── BillOfMaterials ───────────────────────────────────

        m.Entity<BillOfMaterials>(e =>
        {
            e.ToTable("bill_of_materials");
            e.HasKey(b => b.Id);
            e.Property(b => b.Id).HasColumnName("id");
            e.Property(b => b.OrgId).HasColumnName("org_id");
            e.Property(b => b.ProductId).HasColumnName("product_id");
            e.Property(b => b.Version).HasColumnName("version").HasMaxLength(50).HasDefaultValue("1.0");
            e.Property(b => b.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(b => b.Notes).HasColumnName("notes");
            e.Property(b => b.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");

            e.HasMany(b => b.Components)
             .WithOne()
             .HasForeignKey(c => c.BomId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(b => b.OrgId);
            e.HasIndex(b => new { b.OrgId, b.ProductId });
            e.HasIndex(b => new { b.OrgId, b.IsActive });

            e.HasQueryFilter(b => b.OrgId == (_tenant.OrgId ?? Guid.Empty));
        });

        // ── BomComponent ──────────────────────────────────────

        m.Entity<BomComponent>(e =>
        {
            e.ToTable("bom_components");
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).HasColumnName("id");
            e.Property(c => c.BomId).HasColumnName("bom_id");
            e.Property(c => c.ComponentProductId).HasColumnName("component_product_id");
            e.Property(c => c.Quantity).HasColumnName("quantity").HasColumnType("decimal(18,4)");
            e.Property(c => c.UnitOfMeasure).HasColumnName("unit_of_measure").HasMaxLength(50).HasDefaultValue("pcs");
            e.Property(c => c.Notes).HasColumnName("notes");

            e.HasIndex(c => c.BomId);
            e.HasIndex(c => c.ComponentProductId);
        });

        // ── WorkOrder ─────────────────────────────────────────

        m.Entity<WorkOrder>(e =>
        {
            e.ToTable("work_orders");
            e.HasKey(w => w.Id);
            e.Property(w => w.Id).HasColumnName("id");
            e.Property(w => w.OrgId).HasColumnName("org_id");
            e.Property(w => w.WorkOrderNumber).HasColumnName("work_order_number").HasMaxLength(100).IsRequired();
            e.Property(w => w.ProductId).HasColumnName("product_id");
            e.Property(w => w.BomId).HasColumnName("bom_id");
            e.Property(w => w.QuantityToProduce).HasColumnName("quantity_to_produce").HasColumnType("decimal(18,4)");
            e.Property(w => w.QuantityProduced).HasColumnName("quantity_produced").HasColumnType("decimal(18,4)").HasDefaultValue(0m);
            e.Property(w => w.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
            e.Property(w => w.ScheduledStart).HasColumnName("scheduled_start");
            e.Property(w => w.ScheduledEnd).HasColumnName("scheduled_end");
            e.Property(w => w.ActualStart).HasColumnName("actual_start");
            e.Property(w => w.ActualEnd).HasColumnName("actual_end");
            e.Property(w => w.Notes).HasColumnName("notes");
            e.Property(w => w.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            e.Property(w => w.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

            e.HasIndex(w => new { w.OrgId, w.WorkOrderNumber }).IsUnique();
            e.HasIndex(w => w.OrgId);
            e.HasIndex(w => new { w.OrgId, w.Status });
            e.HasIndex(w => new { w.OrgId, w.ProductId });

            e.HasQueryFilter(w => w.OrgId == (_tenant.OrgId ?? Guid.Empty));
        });

        // ── Warehouse ─────────────────────────────────────────

        m.Entity<Warehouse>(e =>
        {
            e.ToTable("warehouses");
            e.HasKey(w => w.Id);
            e.Property(w => w.Id).HasColumnName("id");
            e.Property(w => w.OrgId).HasColumnName("org_id");
            e.Property(w => w.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            e.Property(w => w.Address).HasColumnName("address");
            e.Property(w => w.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(w => w.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");

            e.HasMany(w => w.Locations)
             .WithOne()
             .HasForeignKey(l => l.WarehouseId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(w => w.OrgId);
            e.HasIndex(w => new { w.OrgId, w.IsActive });

            e.HasQueryFilter(w => w.OrgId == (_tenant.OrgId ?? Guid.Empty));
        });

        // ── WarehouseLocation ─────────────────────────────────

        m.Entity<WarehouseLocation>(e =>
        {
            e.ToTable("warehouse_locations");
            e.HasKey(l => l.Id);
            e.Property(l => l.Id).HasColumnName("id");
            e.Property(l => l.WarehouseId).HasColumnName("warehouse_id");
            e.Property(l => l.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            e.Property(l => l.Barcode).HasColumnName("barcode").HasMaxLength(200);
            e.Property(l => l.IsActive).HasColumnName("is_active").HasDefaultValue(true);

            e.HasIndex(l => l.WarehouseId);
            e.HasIndex(l => new { l.WarehouseId, l.Name }).IsUnique();
            e.HasIndex(l => l.Barcode).IsUnique().HasFilter("barcode IS NOT NULL");
        });

        // ── InventoryLevel ────────────────────────────────────

        m.Entity<InventoryLevel>(e =>
        {
            e.ToTable("inventory_levels");
            e.HasKey(il => il.Id);
            e.Property(il => il.Id).HasColumnName("id");
            e.Property(il => il.OrgId).HasColumnName("org_id");
            e.Property(il => il.ProductId).HasColumnName("product_id");
            e.Property(il => il.LocationId).HasColumnName("location_id");
            e.Property(il => il.QuantityOnHand).HasColumnName("quantity_on_hand").HasColumnType("decimal(18,4)").HasDefaultValue(0m);
            e.Property(il => il.QuantityReserved).HasColumnName("quantity_reserved").HasColumnType("decimal(18,4)").HasDefaultValue(0m);
            e.Property(il => il.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
            e.Ignore(il => il.QuantityAvailable); // computed

            e.HasIndex(il => new { il.ProductId, il.LocationId }).IsUnique();
            e.HasIndex(il => il.OrgId);
            e.HasIndex(il => il.LocationId);

            e.HasQueryFilter(il => il.OrgId == (_tenant.OrgId ?? Guid.Empty));
        });

        // ── ChartOfAccount ────────────────────────────────────

        m.Entity<ChartOfAccount>(e =>
        {
            e.ToTable("chart_of_accounts");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id");
            e.Property(a => a.OrgId).HasColumnName("org_id");
            e.Property(a => a.Code).HasColumnName("code").HasMaxLength(20).IsRequired();
            e.Property(a => a.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            e.Property(a => a.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(50);
            e.Property(a => a.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(a => a.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");

            e.HasIndex(a => new { a.OrgId, a.Code }).IsUnique();
            e.HasIndex(a => a.OrgId);
            e.HasIndex(a => new { a.OrgId, a.Type });

            e.HasQueryFilter(a => a.OrgId == (_tenant.OrgId ?? Guid.Empty));
        });

        // ── JournalEntry ──────────────────────────────────────

        m.Entity<JournalEntry>(e =>
        {
            e.ToTable("journal_entries");
            e.HasKey(j => j.Id);
            e.Property(j => j.Id).HasColumnName("id");
            e.Property(j => j.OrgId).HasColumnName("org_id");
            e.Property(j => j.EntryNumber).HasColumnName("entry_number").HasMaxLength(100).IsRequired();
            e.Property(j => j.EntryDate).HasColumnName("entry_date");
            e.Property(j => j.Description).HasColumnName("description").IsRequired();
            e.Property(j => j.Reference).HasColumnName("reference").HasMaxLength(200);
            e.Property(j => j.IsPosted).HasColumnName("is_posted").HasDefaultValue(false);
            e.Property(j => j.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            e.Ignore(j => j.TotalDebits);   // computed
            e.Ignore(j => j.TotalCredits);  // computed
            e.Ignore(j => j.IsBalanced);    // computed

            e.HasMany(j => j.Lines)
             .WithOne()
             .HasForeignKey(l => l.JournalEntryId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(j => new { j.OrgId, j.EntryNumber }).IsUnique();
            e.HasIndex(j => j.OrgId);
            e.HasIndex(j => new { j.OrgId, j.EntryDate });
            e.HasIndex(j => new { j.OrgId, j.IsPosted });

            e.HasQueryFilter(j => j.OrgId == (_tenant.OrgId ?? Guid.Empty));
        });

        // ── JournalLine ───────────────────────────────────────

        m.Entity<JournalLine>(e =>
        {
            e.ToTable("journal_lines");
            e.HasKey(l => l.Id);
            e.Property(l => l.Id).HasColumnName("id");
            e.Property(l => l.JournalEntryId).HasColumnName("journal_entry_id");
            e.Property(l => l.AccountId).HasColumnName("account_id");
            e.Property(l => l.Debit).HasColumnName("debit").HasColumnType("decimal(18,4)").HasDefaultValue(0m);
            e.Property(l => l.Credit).HasColumnName("credit").HasColumnType("decimal(18,4)").HasDefaultValue(0m);
            e.Property(l => l.Memo).HasColumnName("memo");

            e.HasIndex(l => l.JournalEntryId);
            e.HasIndex(l => l.AccountId);
        });

        // ── Customer ──────────────────────────────────────────

        m.Entity<Customer>(e =>
        {
            e.ToTable("customers");
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).HasColumnName("id");
            e.Property(c => c.OrgId).HasColumnName("org_id");
            e.Property(c => c.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            e.Property(c => c.Email).HasColumnName("email").HasMaxLength(255);
            e.Property(c => c.Phone).HasColumnName("phone").HasMaxLength(50);
            e.Property(c => c.Company).HasColumnName("company").HasMaxLength(255);
            e.Property(c => c.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
            e.Property(c => c.TotalRevenue).HasColumnName("total_revenue").HasColumnType("decimal(18,4)");
            e.Property(c => c.Notes).HasColumnName("notes");
            e.Property(c => c.IsActive).HasColumnName("is_active").HasDefaultValue(true);
            e.Property(c => c.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            e.Property(c => c.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

            e.HasIndex(c => c.OrgId);
            e.HasIndex(c => new { c.OrgId, c.Status });
            e.HasIndex(c => new { c.OrgId, c.IsActive });
            e.HasIndex(c => c.Email).HasFilter("email IS NOT NULL");

            e.HasQueryFilter(c => c.OrgId == (_tenant.OrgId ?? Guid.Empty));
        });
    }

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Modified))
        {
            if (entry.Properties.Any(p => p.Metadata.Name == "UpdatedAt"))
                entry.Property("UpdatedAt").CurrentValue = DateTime.UtcNow;
        }
        return await base.SaveChangesAsync(ct);
    }
}

// ── Tenant context ────────────────────────────────────────────────────────────

public interface ITenantContext
{
    Guid? OrgId { get; }
    Guid? UserId { get; }
    bool IsAuthenticated { get; }
}

public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _http;

    public TenantContext(IHttpContextAccessor http) => _http = http;

    public Guid? OrgId
    {
        get
        {
            var v = _http.HttpContext?.User.FindFirst("custom:org_id")?.Value
                 ?? _http.HttpContext?.User.FindFirst("org_id")?.Value
                 ?? _http.HttpContext?.Items["org_id"]?.ToString();
            return Guid.TryParse(v, out var id) ? id : null;
        }
    }

    public Guid? UserId
    {
        get
        {
            var v = _http.HttpContext?.User.FindFirst("sub")?.Value;
            return Guid.TryParse(v, out var id) ? id : null;
        }
    }

    public bool IsAuthenticated => _http.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}
