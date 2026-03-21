namespace Vyne.ERP.Domain.CRM;

public enum CustomerStatus { Lead, Prospect, Active, Churned }

public class Customer
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    public string? Company { get; private set; }
    public CustomerStatus Status { get; private set; } = CustomerStatus.Lead;
    public decimal? TotalRevenue { get; private set; }
    public string? Notes { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private Customer() { }

    public static Customer Create(
        Guid orgId,
        string name,
        string? email = null,
        string? phone = null,
        string? company = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Customer name is required.", nameof(name));

        return new()
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Name = name.Trim(),
            Email = email?.Trim(),
            Phone = phone?.Trim(),
            Company = company?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    public void Update(
        string? name = null,
        string? email = null,
        string? phone = null,
        string? company = null,
        CustomerStatus? status = null,
        string? notes = null)
    {
        if (name is not null)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name cannot be empty.", nameof(name));
            Name = name.Trim();
        }

        if (email is not null) Email = email.Trim();
        if (phone is not null) Phone = phone.Trim();
        if (company is not null) Company = company.Trim();
        if (status.HasValue) Status = status.Value;
        if (notes is not null) Notes = notes;

        UpdatedAt = DateTime.UtcNow;
    }

    public void AddRevenue(decimal amount)
    {
        TotalRevenue = (TotalRevenue ?? 0) + amount;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }
}
