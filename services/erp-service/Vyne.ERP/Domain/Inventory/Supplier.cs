namespace Vyne.ERP.Domain.Inventory;

public class Supplier
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    public string? Address { get; private set; }
    public string? Website { get; private set; }
    public string? ContactPerson { get; private set; }
    public string? Notes { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private Supplier() { }

    public static Supplier Create(
        Guid orgId,
        string name,
        string? email = null,
        string? phone = null,
        string? address = null,
        string? website = null,
        string? contactPerson = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Supplier name is required.", nameof(name));

        return new Supplier
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Name = name.Trim(),
            Email = email?.Trim(),
            Phone = phone?.Trim(),
            Address = address?.Trim(),
            Website = website?.Trim(),
            ContactPerson = contactPerson?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    public void Update(
        string? name = null,
        string? email = null,
        string? phone = null,
        string? address = null,
        string? website = null,
        string? contactPerson = null,
        string? notes = null)
    {
        if (name is not null)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Name cannot be empty.", nameof(name));
            Name = name.Trim();
        }

        if (email is not null)
            Email = email.Trim();

        if (phone is not null)
            Phone = phone.Trim();

        if (address is not null)
            Address = address.Trim();

        if (website is not null)
            Website = website.Trim();

        if (contactPerson is not null)
            ContactPerson = contactPerson.Trim();

        if (notes is not null)
            Notes = notes;

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
}
