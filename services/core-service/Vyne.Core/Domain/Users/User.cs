namespace Vyne.Core.Domain.Users;

public enum UserRole
{
    Owner,
    Admin,
    Manager,
    Member,
    Viewer,
    Guest
}

public enum PresenceStatus
{
    Online,
    Away,
    Offline
}

public class User
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string CognitoId { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? AvatarUrl { get; private set; }
    public UserRole Role { get; private set; } = UserRole.Member;
    public List<string> Permissions { get; private set; } = [];
    public string Timezone { get; private set; } = "UTC";
    public PresenceStatus Presence { get; private set; } = PresenceStatus.Offline;
    public DateTime? LastSeenAt { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    // Navigation
    public Organizations.Organization Organization { get; private set; } = null!;

    private User() { }

    public static User Create(
        Guid orgId,
        string cognitoId,
        string email,
        string name,
        UserRole role = UserRole.Member)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(cognitoId);
        ArgumentException.ThrowIfNullOrWhiteSpace(email);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        var user = new User
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            CognitoId = cognitoId,
            Email = email.ToLowerInvariant().Trim(),
            Name = name.Trim(),
            Role = role,
            Permissions = GetDefaultPermissions(role),
            Timezone = "UTC",
            Presence = PresenceStatus.Offline,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return user;
    }

    public void UpdateRole(UserRole role)
    {
        Role = role;
        Permissions = GetDefaultPermissions(role);
        Touch();
    }

    public void UpdateProfile(string name, string? avatarUrl, string? timezone)
    {
        if (!string.IsNullOrWhiteSpace(name)) Name = name.Trim();
        AvatarUrl = avatarUrl;
        if (!string.IsNullOrWhiteSpace(timezone)) Timezone = timezone;
        Touch();
    }

    public void SetPresence(PresenceStatus status)
    {
        Presence = status;
        if (status == PresenceStatus.Online) LastSeenAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    private void Touch() => UpdatedAt = DateTime.UtcNow;

    private static List<string> GetDefaultPermissions(UserRole role) => role switch
    {
        UserRole.Owner => ["*"],
        UserRole.Admin => ["projects:*", "chat:*", "docs:*", "ops:*", "observe:*", "users:*"],
        UserRole.Manager => ["projects:*", "chat:*", "docs:*", "ops:read", "observe:read"],
        UserRole.Member => ["projects:read", "projects:write", "chat:*", "docs:read", "docs:write"],
        UserRole.Viewer => ["projects:read", "chat:read", "docs:read"],
        UserRole.Guest => ["chat:read"],
        _ => []
    };
}
