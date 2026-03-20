namespace Vyne.Core.Domain.Organizations;

public enum PlanType
{
    Free,
    Starter,
    Pro,
    Enterprise
}

public class OrganizationSettings
{
    public string DefaultTimezone { get; set; } = "UTC";
    public int FiscalYearStart { get; set; } = 1;
    public string Currency { get; set; } = "USD";
    public OrganizationFeatures Features { get; set; } = new();
}

public class OrganizationFeatures
{
    public bool Erp { get; set; } = true;
    public bool Observability { get; set; } = true;
    public bool Ai { get; set; } = true;
}

public class Organization
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string? LogoUrl { get; private set; }
    public PlanType Plan { get; private set; } = PlanType.Free;
    public int MaxMembers { get; private set; } = 5;
    public OrganizationSettings Settings { get; private set; } = new();
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    // EF Core navigation
    public ICollection<Users.User> Users { get; private set; } = [];

    private Organization() { }

    public static Organization Create(string name, string slug)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(slug);

        return new Organization
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            Slug = slug.ToLowerInvariant().Trim(),
            Plan = PlanType.Free,
            MaxMembers = 5,
            Settings = new OrganizationSettings(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void UpdateName(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name.Trim();
        Touch();
    }

    public void UpdateLogoUrl(string? logoUrl)
    {
        LogoUrl = logoUrl;
        Touch();
    }

    public void UpdateSettings(OrganizationSettings settings)
    {
        Settings = settings;
        Touch();
    }

    public void SetPlan(PlanType plan, int maxMembers)
    {
        Plan = plan;
        MaxMembers = maxMembers;
        Touch();
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;
}
