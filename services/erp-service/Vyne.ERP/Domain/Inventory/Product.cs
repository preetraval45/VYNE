namespace Vyne.ERP.Domain.Inventory;

public enum ProductType { Physical, Service, Digital }

public class Product
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string Sku { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public ProductType Type { get; private set; }
    public decimal CostPrice { get; private set; }
    public decimal SalePrice { get; private set; }
    public int StockQuantity { get; private set; }
    public int ReorderPoint { get; private set; }
    public int ReorderQuantity { get; private set; }
    public string? SupplierId { get; private set; }
    public string? Category { get; private set; }
    public string? ImageUrl { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private Product() { }

    public static Product Create(
        Guid orgId,
        string sku,
        string name,
        ProductType type,
        decimal costPrice,
        decimal salePrice,
        int reorderPoint = 0,
        int reorderQuantity = 10)
    {
        if (string.IsNullOrWhiteSpace(sku))
            throw new ArgumentException("SKU is required.", nameof(sku));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required.", nameof(name));
        if (costPrice < 0)
            throw new ArgumentException("Cost price cannot be negative.", nameof(costPrice));
        if (salePrice < 0)
            throw new ArgumentException("Sale price cannot be negative.", nameof(salePrice));

        return new Product
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Sku = sku.Trim().ToUpperInvariant(),
            Name = name.Trim(),
            Type = type,
            CostPrice = costPrice,
            SalePrice = salePrice,
            StockQuantity = 0,
            ReorderPoint = reorderPoint,
            ReorderQuantity = reorderQuantity,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    public void AdjustStock(int delta, string reason)
    {
        if (StockQuantity + delta < 0)
            throw new InvalidOperationException(
                $"Stock adjustment of {delta} would result in negative quantity ({StockQuantity + delta}). Reason: {reason}");

        StockQuantity += delta;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Update(
        string? name = null,
        string? description = null,
        decimal? costPrice = null,
        decimal? salePrice = null,
        int? reorderPoint = null,
        int? reorderQuantity = null,
        string? category = null,
        string? imageUrl = null,
        string? supplierId = null)
    {
        if (name is not null)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name cannot be empty.", nameof(name));
            Name = name.Trim();
        }

        if (description is not null)
            Description = description;

        if (costPrice.HasValue)
        {
            if (costPrice.Value < 0)
                throw new ArgumentException("Cost price cannot be negative.", nameof(costPrice));
            CostPrice = costPrice.Value;
        }

        if (salePrice.HasValue)
        {
            if (salePrice.Value < 0)
                throw new ArgumentException("Sale price cannot be negative.", nameof(salePrice));
            SalePrice = salePrice.Value;
        }

        if (reorderPoint.HasValue)
            ReorderPoint = reorderPoint.Value;

        if (reorderQuantity.HasValue)
            ReorderQuantity = reorderQuantity.Value;

        if (category is not null)
            Category = category;

        if (imageUrl is not null)
            ImageUrl = imageUrl;

        if (supplierId is not null)
            SupplierId = supplierId;

        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsLowStock => StockQuantity <= ReorderPoint;
}
