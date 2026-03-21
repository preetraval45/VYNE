namespace Vyne.ERP.Domain.Settings;

public class ProductCategory
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public Guid? ParentId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? Icon { get; private set; }
    public decimal DefaultTaxRate { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }

    // Navigation — children loaded on demand
    public ICollection<ProductCategory> Children { get; private set; } = [];

    private ProductCategory() { }

    public static ProductCategory Create(
        Guid orgId,
        string name,
        Guid? parentId = null,
        string? description = null,
        string? icon = null,
        decimal defaultTaxRate = 0m)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Category name is required.", nameof(name));
        if (defaultTaxRate < 0 || defaultTaxRate > 100)
            throw new ArgumentException("Tax rate must be between 0 and 100.", nameof(defaultTaxRate));

        return new ProductCategory
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Name = name.Trim(),
            ParentId = parentId,
            Description = description,
            Icon = icon,
            DefaultTaxRate = defaultTaxRate,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
    }

    public void Update(string? name = null, string? description = null, string? icon = null,
        decimal? defaultTaxRate = null, Guid? parentId = null)
    {
        if (name != null)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name cannot be empty.", nameof(name));
            Name = name.Trim();
        }
        if (description != null) Description = description;
        if (icon != null) Icon = icon;
        if (defaultTaxRate.HasValue)
        {
            if (defaultTaxRate.Value < 0 || defaultTaxRate.Value > 100)
                throw new ArgumentException("Tax rate must be between 0 and 100.", nameof(defaultTaxRate));
            DefaultTaxRate = defaultTaxRate.Value;
        }
        if (parentId.HasValue) ParentId = parentId.Value;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
