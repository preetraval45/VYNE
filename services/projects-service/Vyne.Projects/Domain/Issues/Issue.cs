using Pgvector;

namespace Vyne.Projects.Domain.Issues;

public enum IssueStatus { Backlog, Todo, InProgress, InReview, Done, Cancelled }
public enum IssuePriority { Urgent, High, Medium, Low, None }

public class Issue
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public Guid ProjectId { get; private set; }
    public string Identifier { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public IssueStatus Status { get; private set; } = IssueStatus.Backlog;
    public IssuePriority Priority { get; private set; } = IssuePriority.Medium;
    public Guid? AssigneeId { get; private set; }
    public Guid ReporterId { get; private set; }
    public Guid? SprintId { get; private set; }
    public Guid? ParentIssueId { get; private set; }
    public DateTime? DueDate { get; private set; }
    public int? Estimate { get; private set; }
    public decimal Position { get; private set; } = 1m;
    public Vector? Embedding { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    // Navigations
    public Projects.Project Project { get; private set; } = null!;
    public Sprint? Sprint { get; private set; }
    public ICollection<IssueLabel> Labels { get; private set; } = [];
    public ICollection<IssueComment> Comments { get; private set; } = [];
    public ICollection<IssueActivity> Activities { get; private set; } = [];

    private Issue() { }

    public static Issue Create(
        Guid orgId,
        Guid projectId,
        string identifier,
        string title,
        Guid reporterId,
        IssueStatus status = IssueStatus.Backlog,
        IssuePriority priority = IssuePriority.Medium,
        decimal position = 1m)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);

        return new Issue
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            ProjectId = projectId,
            Identifier = identifier,
            Title = title.Trim(),
            Status = status,
            Priority = priority,
            ReporterId = reporterId,
            Position = position,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public IssueStatus GetPreviousStatus() => Status;

    public void Update(
        string? title = null,
        string? description = null,
        IssueStatus? status = null,
        IssuePriority? priority = null,
        Guid? assigneeId = null,
        bool clearAssignee = false,
        Guid? sprintId = null,
        bool clearSprint = false,
        Guid? parentIssueId = null,
        DateTime? dueDate = null,
        int? estimate = null)
    {
        if (!string.IsNullOrWhiteSpace(title)) Title = title.Trim();
        if (description is not null) Description = description;
        if (status.HasValue) Status = status.Value;
        if (priority.HasValue) Priority = priority.Value;
        if (clearAssignee) AssigneeId = null;
        else if (assigneeId.HasValue) AssigneeId = assigneeId;
        if (clearSprint) SprintId = null;
        else if (sprintId.HasValue) SprintId = sprintId;
        if (parentIssueId.HasValue) ParentIssueId = parentIssueId;
        if (dueDate.HasValue) DueDate = dueDate;
        if (estimate.HasValue) Estimate = estimate;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdatePosition(decimal position)
    {
        Position = position;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetEmbedding(Vector embedding)
    {
        Embedding = embedding;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsDeleted => DeletedAt.HasValue;
}
