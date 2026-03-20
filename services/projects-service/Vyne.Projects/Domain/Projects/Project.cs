namespace Vyne.Projects.Domain.Projects;

public enum ProjectStatus { Active, Paused, Completed, Archived }

public class ProjectSettings
{
    public string DefaultIssueStatus { get; set; } = "backlog";
    public string DefaultIssuePriority { get; set; } = "medium";
    public bool SprintsEnabled { get; set; } = true;
    public bool RoadmapEnabled { get; set; } = false;
}

public class Project
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public ProjectStatus Status { get; private set; } = ProjectStatus.Active;
    public Guid? LeadId { get; private set; }
    public string? Icon { get; private set; }
    public string? Color { get; private set; }
    public string Identifier { get; private set; } = string.Empty;
    public ProjectSettings Settings { get; private set; } = new();
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    // Navigations
    public ICollection<Issues.Issue> Issues { get; private set; } = [];
    public ICollection<Issues.Sprint> Sprints { get; private set; } = [];

    private Project() { }

    public static Project Create(Guid orgId, string name, string identifier, Guid? leadId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(identifier);

        return new Project
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Name = name.Trim(),
            Identifier = identifier.ToUpperInvariant().Trim(),
            LeadId = leadId,
            Status = ProjectStatus.Active,
            Settings = new ProjectSettings(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void Update(string? name, string? description, string? icon, string? color, Guid? leadId, ProjectStatus? status)
    {
        if (!string.IsNullOrWhiteSpace(name)) Name = name.Trim();
        if (description is not null) Description = description;
        if (icon is not null) Icon = icon;
        if (color is not null) Color = color;
        if (leadId.HasValue) LeadId = leadId;
        if (status.HasValue) Status = status.Value;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateSettings(ProjectSettings settings)
    {
        Settings = settings;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Archive()
    {
        Status = ProjectStatus.Archived;
        UpdatedAt = DateTime.UtcNow;
    }
}
