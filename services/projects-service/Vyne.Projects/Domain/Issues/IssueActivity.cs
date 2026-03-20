namespace Vyne.Projects.Domain.Issues;

public enum ActivityType
{
    Created,
    StatusChanged,
    PriorityChanged,
    AssigneeChanged,
    TitleChanged,
    DescriptionChanged,
    LabelAdded,
    LabelRemoved,
    SprintChanged,
    CommentAdded,
    DueDateChanged,
    EstimateChanged
}

public class IssueActivity
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public Guid IssueId { get; private set; }
    public Guid UserId { get; private set; }
    public ActivityType Type { get; private set; }
    public string? FromValue { get; private set; }
    public string? ToValue { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public Issue Issue { get; private set; } = null!;

    private IssueActivity() { }

    public static IssueActivity Create(
        Guid orgId, Guid issueId, Guid userId,
        ActivityType type, string? fromValue = null, string? toValue = null)
    {
        return new IssueActivity
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            IssueId = issueId,
            UserId = userId,
            Type = type,
            FromValue = fromValue,
            ToValue = toValue,
            CreatedAt = DateTime.UtcNow
        };
    }
}
