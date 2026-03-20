namespace Vyne.Projects.Domain.Issues;

public class Label
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Color { get; private set; } = "#6C47FF";

    public ICollection<IssueLabel> IssueLabels { get; private set; } = [];

    private Label() { }

    public static Label Create(Guid orgId, string name, string color = "#6C47FF")
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return new Label
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Name = name.Trim(),
            Color = color
        };
    }
}

public class IssueLabel
{
    public Guid IssueId { get; set; }
    public Guid LabelId { get; set; }

    public Issue Issue { get; set; } = null!;
    public Label Label { get; set; } = null!;
}
