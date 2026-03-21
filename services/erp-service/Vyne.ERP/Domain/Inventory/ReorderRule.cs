namespace Vyne.ERP.Domain.Inventory;

public class ReorderRule
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public Guid ProductId { get; private set; }
    public Guid? SupplierId { get; private set; }
    public decimal MinQty { get; private set; }      // trigger point — reorder when stock falls to/below this
    public decimal MaxQty { get; private set; }      // reorder up to this level (0 = use ReorderQty instead)
    public decimal ReorderQty { get; private set; }  // fixed qty to order (used when MaxQty == 0)
    public bool IsActive { get; private set; } = true;
    public DateTime? LastTriggeredAt { get; private set; }

    private ReorderRule() { }

    public static ReorderRule Create(
        Guid orgId,
        Guid productId,
        decimal minQty,
        decimal reorderQty,
        Guid? supplierId = null,
        decimal maxQty = 0m)
    {
        if (minQty < 0)
            throw new ArgumentException("MinQty cannot be negative.", nameof(minQty));
        if (reorderQty <= 0)
            throw new ArgumentException("ReorderQty must be greater than zero.", nameof(reorderQty));
        if (maxQty < 0)
            throw new ArgumentException("MaxQty cannot be negative.", nameof(maxQty));

        return new ReorderRule
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            ProductId = productId,
            SupplierId = supplierId,
            MinQty = minQty,
            MaxQty = maxQty,
            ReorderQty = reorderQty,
            IsActive = true,
        };
    }

    public void Update(decimal? minQty = null, decimal? reorderQty = null,
        decimal? maxQty = null, Guid? supplierId = null)
    {
        if (minQty.HasValue)
        {
            if (minQty.Value < 0)
                throw new ArgumentException("MinQty cannot be negative.", nameof(minQty));
            MinQty = minQty.Value;
        }
        if (reorderQty.HasValue)
        {
            if (reorderQty.Value <= 0)
                throw new ArgumentException("ReorderQty must be greater than zero.", nameof(reorderQty));
            ReorderQty = reorderQty.Value;
        }
        if (maxQty.HasValue)
        {
            if (maxQty.Value < 0)
                throw new ArgumentException("MaxQty cannot be negative.", nameof(maxQty));
            MaxQty = maxQty.Value;
        }
        if (supplierId.HasValue) SupplierId = supplierId.Value;
    }

    /// <summary>Returns the quantity to order based on current stock.</summary>
    public decimal GetOrderQuantity(decimal currentStock)
    {
        if (MaxQty > 0)
            return Math.Max(0, MaxQty - currentStock);
        return ReorderQty;
    }

    /// <summary>Returns true when stock has fallen to or below the trigger threshold.</summary>
    public bool ShouldTrigger(decimal currentStock) => IsActive && currentStock <= MinQty;

    public void Trigger()
    {
        LastTriggeredAt = DateTime.UtcNow;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
