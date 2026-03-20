namespace Vyne.Projects.Domain.Issues;

public enum SprintStatus { Planned, Active, Completed }

public class Sprint
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public Guid ProjectId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public DateOnly? StartDate { get; private set; }
    public DateOnly? EndDate { get; private set; }
    public SprintStatus Status { get; private set; } = SprintStatus.Planned;
    public string? Goal { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    public Projects.Project Project { get; private set; } = null!;
    public ICollection<Issue> Issues { get; private set; } = [];

    private Sprint() { }

    public static Sprint Create(Guid orgId, Guid projectId, string name, DateOnly? startDate = null, DateOnly? endDate = null, string? goal = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return new Sprint
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            ProjectId = projectId,
            Name = name.Trim(),
            StartDate = startDate,
            EndDate = endDate,
            Goal = goal,
            Status = SprintStatus.Planned,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void Start()
    {
        if (Status != SprintStatus.Planned)
            throw new InvalidOperationException($"Cannot start sprint in status {Status}");
        Status = SprintStatus.Active;
        if (!StartDate.HasValue) StartDate = DateOnly.FromDateTime(DateTime.UtcNow);
        UpdatedAt = DateTime.UtcNow;
    }

    public void Complete()
    {
        if (Status != SprintStatus.Active)
            throw new InvalidOperationException($"Cannot complete sprint in status {Status}");
        Status = SprintStatus.Completed;
        if (!EndDate.HasValue) EndDate = DateOnly.FromDateTime(DateTime.UtcNow);
        UpdatedAt = DateTime.UtcNow;
    }

    public void Update(string? name, string? goal, DateOnly? startDate, DateOnly? endDate)
    {
        if (!string.IsNullOrWhiteSpace(name)) Name = name.Trim();
        if (goal is not null) Goal = goal;
        if (startDate.HasValue) StartDate = startDate;
        if (endDate.HasValue) EndDate = endDate;
        UpdatedAt = DateTime.UtcNow;
    }
}
