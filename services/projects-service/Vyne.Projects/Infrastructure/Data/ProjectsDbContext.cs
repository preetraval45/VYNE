using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Domain.Projects;

namespace Vyne.Projects.Infrastructure.Data;

public class ProjectsDbContext : DbContext
{
    private readonly ITenantContext _tenant;

    public ProjectsDbContext(DbContextOptions<ProjectsDbContext> options, ITenantContext tenant)
        : base(options)
    {
        _tenant = tenant;
    }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Issue> Issues => Set<Issue>();
    public DbSet<Sprint> Sprints => Set<Sprint>();
    public DbSet<IssueComment> Comments => Set<IssueComment>();
    public DbSet<IssueActivity> Activities => Set<IssueActivity>();
    public DbSet<Label> Labels => Set<Label>();
    public DbSet<IssueLabel> IssueLabels => Set<IssueLabel>();
    public DbSet<ProjectIssueCounter> IssueCounters => Set<ProjectIssueCounter>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        base.OnModelCreating(m);

        // Enable pgvector
        m.HasPostgresExtension("vector");

        // ── Project ───────────────────────────────────────────

        m.Entity<Project>(e =>
        {
            e.ToTable("projects");
            e.HasKey(p => p.Id);
            e.Property(p => p.Id).HasColumnName("id");
            e.Property(p => p.OrgId).HasColumnName("org_id");
            e.Property(p => p.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            e.Property(p => p.Description).HasColumnName("description");
            e.Property(p => p.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
            e.Property(p => p.LeadId).HasColumnName("lead_id");
            e.Property(p => p.Icon).HasColumnName("icon").HasMaxLength(10);
            e.Property(p => p.Color).HasColumnName("color").HasMaxLength(20);
            e.Property(p => p.Identifier).HasColumnName("identifier").HasMaxLength(20).IsRequired();
            e.HasIndex(p => new { p.OrgId, p.Identifier }).IsUnique();
            e.Property(p => p.Settings)
                .HasColumnName("settings")
                .HasColumnType("jsonb")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                    v => JsonSerializer.Deserialize<ProjectSettings>(v, JsonSerializerOptions.Default) ?? new());
            e.Property(p => p.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            e.Property(p => p.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

            e.HasMany(p => p.Issues).WithOne(i => i.Project).HasForeignKey(i => i.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(p => p.Sprints).WithOne(s => s.Project).HasForeignKey(s => s.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── Sprint ────────────────────────────────────────────

        m.Entity<Sprint>(e =>
        {
            e.ToTable("sprints");
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).HasColumnName("id");
            e.Property(s => s.OrgId).HasColumnName("org_id");
            e.Property(s => s.ProjectId).HasColumnName("project_id");
            e.Property(s => s.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            e.Property(s => s.StartDate).HasColumnName("start_date");
            e.Property(s => s.EndDate).HasColumnName("end_date");
            e.Property(s => s.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
            e.Property(s => s.Goal).HasColumnName("goal");
            e.Property(s => s.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            e.Property(s => s.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
        });

        // ── Label ─────────────────────────────────────────────

        m.Entity<Label>(e =>
        {
            e.ToTable("labels");
            e.HasKey(l => l.Id);
            e.Property(l => l.Id).HasColumnName("id");
            e.Property(l => l.OrgId).HasColumnName("org_id");
            e.Property(l => l.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            e.Property(l => l.Color).HasColumnName("color").HasMaxLength(20);
            e.HasIndex(l => new { l.OrgId, l.Name }).IsUnique();
        });

        // ── Issue ─────────────────────────────────────────────

        m.Entity<Issue>(e =>
        {
            e.ToTable("issues");
            e.HasKey(i => i.Id);
            e.Property(i => i.Id).HasColumnName("id");
            e.Property(i => i.OrgId).HasColumnName("org_id");
            e.Property(i => i.ProjectId).HasColumnName("project_id");
            e.Property(i => i.Identifier).HasColumnName("identifier").HasMaxLength(30).IsRequired();
            e.HasIndex(i => new { i.OrgId, i.Identifier }).IsUnique();
            e.Property(i => i.Title).HasColumnName("title").HasMaxLength(500).IsRequired();
            e.Property(i => i.Description).HasColumnName("description");
            e.Property(i => i.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
            e.Property(i => i.Priority).HasColumnName("priority").HasConversion<string>().HasMaxLength(50);
            e.Property(i => i.AssigneeId).HasColumnName("assignee_id");
            e.Property(i => i.ReporterId).HasColumnName("reporter_id");
            e.Property(i => i.SprintId).HasColumnName("sprint_id");
            e.Property(i => i.ParentIssueId).HasColumnName("parent_issue_id");
            e.Property(i => i.DueDate).HasColumnName("due_date");
            e.Property(i => i.Estimate).HasColumnName("estimate");
            e.Property(i => i.Position).HasColumnName("position").HasColumnType("decimal(20,10)");
            e.Property(i => i.Embedding).HasColumnName("embedding").HasColumnType("vector(1536)");
            e.Ignore(i => i.Embedding); // mapped via pgvector extension
            e.Property(i => i.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            e.Property(i => i.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
            e.Property(i => i.DeletedAt).HasColumnName("deleted_at");
            e.HasQueryFilter(i => i.DeletedAt == null);

            e.HasMany(i => i.Comments).WithOne(c => c.Issue).HasForeignKey(c => c.IssueId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(i => i.Activities).WithOne(a => a.Issue).HasForeignKey(a => a.IssueId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(i => i.Labels).WithOne(l => l.Issue).HasForeignKey(l => l.IssueId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── IssueLabel ────────────────────────────────────────

        m.Entity<IssueLabel>(e =>
        {
            e.ToTable("issue_labels");
            e.HasKey(il => new { il.IssueId, il.LabelId });
            e.Property(il => il.IssueId).HasColumnName("issue_id");
            e.Property(il => il.LabelId).HasColumnName("label_id");
            e.HasOne(il => il.Label).WithMany(l => l.IssueLabels).HasForeignKey(il => il.LabelId);
        });

        // ── IssueComment ──────────────────────────────────────

        m.Entity<IssueComment>(e =>
        {
            e.ToTable("issue_comments");
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).HasColumnName("id");
            e.Property(c => c.OrgId).HasColumnName("org_id");
            e.Property(c => c.IssueId).HasColumnName("issue_id");
            e.Property(c => c.UserId).HasColumnName("user_id");
            e.Property(c => c.Content).HasColumnName("content").IsRequired();
            e.Property(c => c.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            e.Property(c => c.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
            e.Property(c => c.DeletedAt).HasColumnName("deleted_at");
            e.HasQueryFilter(c => c.DeletedAt == null);
        });

        // ── IssueActivity ─────────────────────────────────────

        m.Entity<IssueActivity>(e =>
        {
            e.ToTable("issue_activities");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id");
            e.Property(a => a.OrgId).HasColumnName("org_id");
            e.Property(a => a.IssueId).HasColumnName("issue_id");
            e.Property(a => a.UserId).HasColumnName("user_id");
            e.Property(a => a.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(100);
            e.Property(a => a.FromValue).HasColumnName("from_value");
            e.Property(a => a.ToValue).HasColumnName("to_value");
            e.Property(a => a.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
        });

        // ── Issue Counter ─────────────────────────────────────

        m.Entity<ProjectIssueCounter>(e =>
        {
            e.ToTable("project_issue_counters");
            e.HasKey(c => c.ProjectId);
            e.Property(c => c.ProjectId).HasColumnName("project_id");
            e.Property(c => c.NextNumber).HasColumnName("next_number").HasDefaultValue(1);
        });
    }

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Modified))
        {
            if (entry.Properties.Any(p => p.Metadata.Name == "UpdatedAt"))
                entry.Property("UpdatedAt").CurrentValue = DateTime.UtcNow;
        }
        return await base.SaveChangesAsync(ct);
    }
}

public class ProjectIssueCounter
{
    public Guid ProjectId { get; set; }
    public int NextNumber { get; set; } = 1;
}

public interface ITenantContext
{
    Guid? OrgId { get; }
    Guid? UserId { get; }
    bool IsAuthenticated { get; }
}

public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _http;
    public TenantContext(IHttpContextAccessor http) => _http = http;

    public Guid? OrgId
    {
        get
        {
            var v = _http.HttpContext?.User.FindFirst("custom:org_id")?.Value
                 ?? _http.HttpContext?.User.FindFirst("org_id")?.Value
                 ?? _http.HttpContext?.Items["org_id"]?.ToString();
            return Guid.TryParse(v, out var id) ? id : null;
        }
    }

    public Guid? UserId
    {
        get
        {
            var v = _http.HttpContext?.User.FindFirst("sub")?.Value;
            return Guid.TryParse(v, out var id) ? id : null;
        }
    }

    public bool IsAuthenticated => _http.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}
