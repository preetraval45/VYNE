namespace Vyne.ERP.Domain.Pricing;

public class PriceList
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string Name { get; private set; } = string.Empty;   // e.g. "VIP Customers", "Wholesale"
    public string Currency { get; private set; } = "USD";
    public decimal? GlobalDiscount { get; private set; }       // % off all items
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }

    private readonly List<PriceListItem> _items = [];
    public IReadOnlyCollection<PriceListItem> Items => _items.AsReadOnly();

    private PriceList() { }

    public static PriceList Create(Guid orgId, string name, string currency = "USD", decimal? globalDiscount = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Price list name is required.", nameof(name));
        if (globalDiscount.HasValue && (globalDiscount.Value < 0 || globalDiscount.Value > 100))
            throw new ArgumentException("Global discount must be between 0 and 100.", nameof(globalDiscount));

        return new PriceList
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Name = name.Trim(),
            Currency = string.IsNullOrWhiteSpace(currency) ? "USD" : currency.Trim().ToUpperInvariant(),
            GlobalDiscount = globalDiscount,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
    }

    public void Update(string? name = null, string? currency = null, decimal? globalDiscount = null)
    {
        if (name != null)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name cannot be empty.", nameof(name));
            Name = name.Trim();
        }
        if (currency != null)
            Currency = currency.Trim().ToUpperInvariant();
        if (globalDiscount.HasValue)
        {
            if (globalDiscount.Value < 0 || globalDiscount.Value > 100)
                throw new ArgumentException("Global discount must be between 0 and 100.", nameof(globalDiscount));
            GlobalDiscount = globalDiscount.Value;
        }
    }

    public PriceListItem AddItem(Guid productId, decimal price, int? minQty = null)
    {
        if (price < 0)
            throw new ArgumentException("Price cannot be negative.", nameof(price));

        // Replace existing item for same product+minQty combination
        var existing = _items.FirstOrDefault(i => i.ProductId == productId && i.MinQty == minQty);
        if (existing != null) _items.Remove(existing);

        var item = PriceListItem.Create(Id, productId, price, minQty);
        _items.Add(item);
        return item;
    }

    public bool RemoveItem(Guid itemId)
    {
        var item = _items.FirstOrDefault(i => i.Id == itemId);
        if (item == null) return false;
        _items.Remove(item);
        return true;
    }

    /// <summary>
    /// Returns the effective price for a product and quantity.
    /// Product-specific price takes priority; falls back to global discount on base price.
    /// </summary>
    public decimal GetPrice(Guid productId, decimal basePrice, int qty = 1)
    {
        // Best matching item: product-specific price with quantity threshold met, highest MinQty first
        var item = _items
            .Where(i => i.ProductId == productId && (i.MinQty == null || qty >= i.MinQty))
            .OrderByDescending(i => i.MinQty ?? 0)
            .FirstOrDefault();

        if (item != null) return item.Price;

        if (GlobalDiscount.HasValue)
            return Math.Round(basePrice * (1 - GlobalDiscount.Value / 100m), 4);

        return basePrice;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}

public class PriceListItem
{
    public Guid Id { get; private set; }
    public Guid PriceListId { get; private set; }
    public Guid ProductId { get; private set; }
    public decimal Price { get; private set; }
    public int? MinQty { get; private set; }

    private PriceListItem() { }

    public static PriceListItem Create(Guid priceListId, Guid productId, decimal price, int? minQty = null)
    {
        if (price < 0)
            throw new ArgumentException("Price cannot be negative.", nameof(price));

        return new PriceListItem
        {
            Id = Guid.NewGuid(),
            PriceListId = priceListId,
            ProductId = productId,
            Price = price,
            MinQty = minQty,
        };
    }

    public void UpdatePrice(decimal price)
    {
        if (price < 0)
            throw new ArgumentException("Price cannot be negative.", nameof(price));
        Price = price;
    }
}
