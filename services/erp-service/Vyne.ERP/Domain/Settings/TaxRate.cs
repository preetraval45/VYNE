namespace Vyne.ERP.Domain.Settings;

public class TaxRate
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string Name { get; private set; } = string.Empty;   // e.g. "GST", "VAT", "Sales Tax"
    public decimal Rate { get; private set; }                   // e.g. 10.0 = 10%
    public bool IsDefault { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }

    private TaxRate() { }

    public static TaxRate Create(Guid orgId, string name, decimal rate, bool isDefault = false)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tax rate name is required.", nameof(name));
        if (rate < 0 || rate > 100)
            throw new ArgumentException("Tax rate must be between 0 and 100.", nameof(rate));

        return new TaxRate
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Name = name.Trim(),
            Rate = rate,
            IsDefault = isDefault,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
    }

    public void SetDefault() => IsDefault = true;

    public void ClearDefault() => IsDefault = false;

    public void Update(string? name = null, decimal? rate = null)
    {
        if (name != null)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name cannot be empty.", nameof(name));
            Name = name.Trim();
        }
        if (rate.HasValue)
        {
            if (rate.Value < 0 || rate.Value > 100)
                throw new ArgumentException("Tax rate must be between 0 and 100.", nameof(rate));
            Rate = rate.Value;
        }
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
