namespace Vyne.Projects.Domain.Docs;

public class Document
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public Guid? ParentId { get; private set; }
    public string Title { get; private set; } = "Untitled";
    public string? Icon { get; private set; }
    public string? CoverUrl { get; private set; }
    public bool IsPublished { get; private set; }
    public bool IsTemplate { get; private set; }
    public Guid CreatedBy { get; private set; }
    public Guid? UpdatedBy { get; private set; }
    public decimal Position { get; private set; } = 1m;
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    // Latest content (not persisted — loaded separately from document_versions)
    public string? Content { get; private set; } // JSONB string

    private Document() { }

    public static Document Create(
        Guid orgId,
        Guid createdBy,
        string title = "Untitled",
        Guid? parentId = null,
        string? icon = null)
        => new()
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            CreatedBy = createdBy,
            Title = title,
            ParentId = parentId,
            Icon = icon,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

    public void Update(
        string? title = null,
        string? icon = null,
        string? coverUrl = null,
        Guid? updatedBy = null)
    {
        if (title != null) Title = title;
        if (icon != null) Icon = icon;
        if (coverUrl != null) CoverUrl = coverUrl;
        UpdatedBy = updatedBy;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetContent(string? content)
    {
        Content = content;
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsDeleted => DeletedAt.HasValue;
}

public class DocumentVersion
{
    public Guid Id { get; private set; }
    public Guid DocumentId { get; private set; }
    public string Content { get; private set; } = "{}"; // TipTap JSON
    public int Version { get; private set; }
    public Guid CreatedBy { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private DocumentVersion() { }

    public static DocumentVersion Create(
        Guid documentId,
        string content,
        int version,
        Guid createdBy)
        => new()
        {
            Id = Guid.NewGuid(),
            DocumentId = documentId,
            Content = content,
            Version = version,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow,
        };
}
