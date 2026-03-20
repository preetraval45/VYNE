using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Vyne.Core.Domain.Organizations;
using Vyne.Core.Domain.Users;

namespace Vyne.Core.Infrastructure.Data;

public class VyneDbContext : DbContext
{
    private readonly ITenantContext _tenantContext;

    public VyneDbContext(DbContextOptions<VyneDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Organization ─────────────────────────────────────────

        modelBuilder.Entity<Organization>(entity =>
        {
            entity.ToTable("organizations");
            entity.HasKey(o => o.Id);
            entity.Property(o => o.Id).HasColumnName("id");
            entity.Property(o => o.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(o => o.Slug).HasColumnName("slug").HasMaxLength(100).IsRequired();
            entity.HasIndex(o => o.Slug).IsUnique();
            entity.Property(o => o.LogoUrl).HasColumnName("logo_url").HasMaxLength(2048);
            entity.Property(o => o.Plan)
                .HasColumnName("plan")
                .HasConversion<string>()
                .HasMaxLength(50);
            entity.Property(o => o.MaxMembers).HasColumnName("max_members").HasDefaultValue(5);
            entity.Property(o => o.Settings)
                .HasColumnName("settings")
                .HasColumnType("jsonb")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                    v => JsonSerializer.Deserialize<OrganizationSettings>(v, JsonSerializerOptions.Default)
                        ?? new OrganizationSettings());
            entity.Property(o => o.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            entity.Property(o => o.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");
        });

        // ── User ─────────────────────────────────────────────────

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Id).HasColumnName("id");
            entity.Property(u => u.OrgId).HasColumnName("org_id").IsRequired();
            entity.Property(u => u.CognitoId).HasColumnName("cognito_id").HasMaxLength(256).IsRequired();
            entity.HasIndex(u => u.CognitoId).IsUnique();
            entity.Property(u => u.Email).HasColumnName("email").HasMaxLength(320).IsRequired();
            entity.HasIndex(u => new { u.OrgId, u.Email }).IsUnique();
            entity.Property(u => u.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(u => u.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(2048);
            entity.Property(u => u.Role)
                .HasColumnName("role")
                .HasConversion<string>()
                .HasMaxLength(50);
            entity.Property(u => u.Permissions)
                .HasColumnName("permissions")
                .HasColumnType("text[]")
                .HasConversion(
                    v => v.ToArray(),
                    v => v.ToList());
            entity.Property(u => u.Timezone).HasColumnName("timezone").HasMaxLength(100).HasDefaultValue("UTC");
            entity.Property(u => u.Presence)
                .HasColumnName("presence")
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(PresenceStatus.Offline);
            entity.Property(u => u.LastSeenAt).HasColumnName("last_seen_at");
            entity.Property(u => u.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("NOW()");
            entity.Property(u => u.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("NOW()");

            entity.HasOne(u => u.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(u => u.OrgId)
                .OnDelete(DeleteBehavior.Restrict);

            // ── Row-Level Security filter ─────────────────────────
            // Applied via TenantMiddleware which sets app.current_org_id
            // The actual RLS is enforced by PostgreSQL policies (see migration SQL)
        });
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Set updated_at on all modified entities
        foreach (var entry in ChangeTracker.Entries()
            .Where(e => e.State == EntityState.Modified))
        {
            if (entry.Properties.Any(p => p.Metadata.Name == "UpdatedAt"))
            {
                entry.Property("UpdatedAt").CurrentValue = DateTime.UtcNow;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}

public interface ITenantContext
{
    Guid? OrgId { get; }
    string? UserId { get; }
    bool IsAuthenticated { get; }
}

public class TenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? OrgId
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst("org_id")?.Value
                ?? _httpContextAccessor.HttpContext?.Items["org_id"]?.ToString();
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }

    public string? UserId =>
        _httpContextAccessor.HttpContext?.User.FindFirst("sub")?.Value;

    public bool IsAuthenticated =>
        _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}
