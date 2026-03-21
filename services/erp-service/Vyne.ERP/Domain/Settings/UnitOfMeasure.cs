namespace Vyne.ERP.Domain.Settings;

public class UnitOfMeasure
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string Name { get; private set; } = string.Empty;      // e.g. "Kilogram"
    public string Symbol { get; private set; } = string.Empty;    // e.g. "kg"
    public string Category { get; private set; } = string.Empty;  // e.g. "Weight", "Volume", "Length", "Quantity"
    public decimal ConversionFactor { get; private set; } = 1m;   // relative to base unit in same category
    public bool IsBase { get; private set; }
    public bool IsActive { get; private set; } = true;

    private UnitOfMeasure() { }

    public static UnitOfMeasure Create(
        Guid orgId,
        string name,
        string symbol,
        string category,
        bool isBase = false,
        decimal conversionFactor = 1m)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Unit name is required.", nameof(name));
        if (string.IsNullOrWhiteSpace(symbol))
            throw new ArgumentException("Unit symbol is required.", nameof(symbol));
        if (string.IsNullOrWhiteSpace(category))
            throw new ArgumentException("Unit category is required.", nameof(category));
        if (conversionFactor <= 0)
            throw new ArgumentException("Conversion factor must be greater than zero.", nameof(conversionFactor));

        return new UnitOfMeasure
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Name = name.Trim(),
            Symbol = symbol.Trim(),
            Category = category.Trim(),
            IsBase = isBase,
            ConversionFactor = isBase ? 1m : conversionFactor,
            IsActive = true,
        };
    }

    public void Update(string? name = null, string? symbol = null, decimal? conversionFactor = null)
    {
        if (name != null)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name cannot be empty.", nameof(name));
            Name = name.Trim();
        }
        if (symbol != null)
        {
            if (string.IsNullOrWhiteSpace(symbol))
                throw new ArgumentException("Symbol cannot be empty.", nameof(symbol));
            Symbol = symbol.Trim();
        }
        if (conversionFactor.HasValue)
        {
            if (conversionFactor.Value <= 0)
                throw new ArgumentException("Conversion factor must be greater than zero.", nameof(conversionFactor));
            if (IsBase)
                throw new InvalidOperationException("Cannot change the conversion factor of a base unit.");
            ConversionFactor = conversionFactor.Value;
        }
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;

    /// <summary>Converts a quantity in this unit to the base unit for this category.</summary>
    public decimal ToBaseUnit(decimal quantity) => quantity * ConversionFactor;

    /// <summary>Converts a quantity in the base unit to this unit.</summary>
    public decimal FromBaseUnit(decimal quantity) => quantity / ConversionFactor;
}
