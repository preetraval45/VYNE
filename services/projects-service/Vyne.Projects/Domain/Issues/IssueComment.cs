namespace Vyne.Projects.Domain.Issues;

public class IssueComment
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public Guid IssueId { get; private set; }
    public Guid UserId { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    public Issue Issue { get; private set; } = null!;

    private IssueComment() { }

    public static IssueComment Create(Guid orgId, Guid issueId, Guid userId, string content)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(content);
        return new IssueComment
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            IssueId = issueId,
            UserId = userId,
            Content = content.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void Edit(string content)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(content);
        Content = content.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
}
