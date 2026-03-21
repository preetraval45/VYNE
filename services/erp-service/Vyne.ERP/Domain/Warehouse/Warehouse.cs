namespace Vyne.ERP.Domain.Warehouse;

public class Warehouse
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Address { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }
    public ICollection<WarehouseLocation> Locations { get; private set; } = [];

    private Warehouse() { }

    public static Warehouse Create(Guid orgId, string name, string? address = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Warehouse name is required.", nameof(name));

        return new()
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Name = name.Trim(),
            Address = address,
            CreatedAt = DateTime.UtcNow,
        };
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}

public class WarehouseLocation
{
    public Guid Id { get; private set; }
    public Guid WarehouseId { get; private set; }
    public string Name { get; private set; } = string.Empty;  // e.g. "A-01-01" (aisle-rack-bin)
    public string? Barcode { get; private set; }
    public bool IsActive { get; private set; } = true;

    private WarehouseLocation() { }

    public static WarehouseLocation Create(Guid warehouseId, string name, string? barcode = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Location name is required.", nameof(name));

        return new()
        {
            Id = Guid.NewGuid(),
            WarehouseId = warehouseId,
            Name = name.Trim(),
            Barcode = barcode,
        };
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}

public class InventoryLevel
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public Guid ProductId { get; private set; }
    public Guid LocationId { get; private set; }
    public decimal QuantityOnHand { get; private set; }
    public decimal QuantityReserved { get; private set; }
    public decimal QuantityAvailable => QuantityOnHand - QuantityReserved;
    public DateTime UpdatedAt { get; private set; }

    private InventoryLevel() { }

    public static InventoryLevel Create(
        Guid orgId,
        Guid productId,
        Guid locationId,
        decimal qty = 0)
        => new()
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            ProductId = productId,
            LocationId = locationId,
            QuantityOnHand = qty,
            UpdatedAt = DateTime.UtcNow,
        };

    public void Adjust(decimal delta)
    {
        if (QuantityOnHand + delta < 0)
            throw new InvalidOperationException(
                $"Stock adjustment of {delta} would result in negative quantity ({QuantityOnHand + delta}).");

        QuantityOnHand += delta;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reserve(decimal qty)
    {
        if (qty <= 0)
            throw new ArgumentException("Reserve quantity must be greater than zero.", nameof(qty));
        if (qty > QuantityAvailable)
            throw new InvalidOperationException(
                $"Cannot reserve {qty}; only {QuantityAvailable} available.");

        QuantityReserved += qty;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Unreserve(decimal qty)
    {
        QuantityReserved = Math.Max(0, QuantityReserved - qty);
        UpdatedAt = DateTime.UtcNow;
    }
}
