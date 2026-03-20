using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Vyne.Core.Domain.Users;
using Vyne.Core.Infrastructure.Data;
using Vyne.Core.Infrastructure.Events;
using Vyne.Core.Infrastructure.Repositories;
using Vyne.Core.Infrastructure.Services;

namespace Vyne.Core.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepo;
    private readonly ICognitoService _cognito;
    private readonly IEventPublisher _events;
    private readonly ITenantContext _tenant;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        IUserRepository userRepo,
        ICognitoService cognito,
        IEventPublisher events,
        ITenantContext tenant,
        ILogger<UsersController> logger)
    {
        _userRepo = userRepo;
        _cognito = cognito;
        _events = events;
        _tenant = tenant;
        _logger = logger;
    }

    /// <summary>GET /users — List all users in org</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (_tenant.OrgId is null) return Unauthorized();

        var users = await _userRepo.GetByOrgAsync(_tenant.OrgId.Value, ct);
        return Ok(new { data = users.Select(Map) });
    }

    /// <summary>GET /users/{id}</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var user = await _userRepo.GetByIdAsync(id, ct);
        if (user is null || user.OrgId != _tenant.OrgId) return NotFound();

        return Ok(new { data = Map(user) });
    }

    /// <summary>POST /users/invite — Invite a user to the org</summary>
    [HttpPost("invite")]
    public async Task<IActionResult> Invite([FromBody] InviteUserRequest request, CancellationToken ct)
    {
        if (_tenant.OrgId is null) return Unauthorized();

        // Check permission
        if (!HasPermission("users:write"))
            return Forbid();

        // Check if email already in org
        var existing = await _userRepo.GetByEmailAsync(_tenant.OrgId.Value, request.Email, ct);
        if (existing is not null)
            return Conflict(new { error = new { code = "USER_EXISTS", message = "User already in org" } });

        // Create Cognito user
        var tempPassword = Guid.NewGuid().ToString("N")[..12] + "Aa1!";
        string cognitoId;
        try
        {
            cognitoId = await _cognito.CreateUserAsync(
                request.Email,
                tempPassword,
                request.Name,
                _tenant.OrgId.Value.ToString(),
                request.Role.ToString().ToLower(),
                ct);
        }
        catch (InvalidOperationException)
        {
            // Cognito user exists but not in DB — link them
            cognitoId = request.Email; // Cognito uses email as username
        }

        var user = User.Create(_tenant.OrgId.Value, cognitoId, request.Email, request.Name, request.Role);
        await _userRepo.CreateAsync(user, ct);

        // Publish event for notification service to send invite email
        await _events.PublishAsync(
            "vyne.user.invited",
            "vyne.core-service",
            new
            {
                orgId = _tenant.OrgId.Value,
                invitedEmail = request.Email,
                invitedBy = _tenant.UserId,
                role = request.Role.ToString().ToLower(),
                userId = user.Id
            },
            ct);

        _logger.LogInformation("User invited: {Email} to org {OrgId}", request.Email, _tenant.OrgId);

        return Created($"/users/{user.Id}", new { data = Map(user) });
    }

    /// <summary>PATCH /users/{id}/role — Update user role</summary>
    [HttpPatch("{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request, CancellationToken ct)
    {
        if (!HasPermission("users:write")) return Forbid();

        var user = await _userRepo.GetByIdAsync(id, ct);
        if (user is null || user.OrgId != _tenant.OrgId) return NotFound();

        user.UpdateRole(request.Role);
        await _userRepo.UpdateAsync(user, ct);

        // Sync to Cognito
        await _cognito.UpdateUserAttributesAsync(
            user.CognitoId,
            user.OrgId.ToString(),
            request.Role.ToString().ToLower(),
            ct);

        return Ok(new { data = Map(user) });
    }

    /// <summary>DELETE /users/{id} — Remove user from org</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remove(Guid id, CancellationToken ct)
    {
        if (!HasPermission("users:write")) return Forbid();

        var user = await _userRepo.GetByIdAsync(id, ct);
        if (user is null || user.OrgId != _tenant.OrgId) return NotFound();

        if (user.Role == UserRole.Owner)
            return BadRequest(new { error = new { code = "CANNOT_REMOVE_OWNER", message = "Cannot remove org owner" } });

        await _userRepo.DeleteAsync(id, ct);
        return NoContent();
    }

    private bool HasPermission(string permission)
    {
        var perms = User.FindAll("permissions").Select(c => c.Value).ToList();
        return perms.Contains("*") || perms.Contains(permission) ||
               perms.Any(p => p.EndsWith(":*") && permission.StartsWith(p[..^1]));
    }

    private static object Map(User user) => new
    {
        id = user.Id,
        orgId = user.OrgId,
        email = user.Email,
        name = user.Name,
        avatarUrl = user.AvatarUrl,
        role = user.Role.ToString().ToLower(),
        permissions = user.Permissions,
        timezone = user.Timezone,
        presence = user.Presence.ToString().ToLower(),
        lastSeenAt = user.LastSeenAt,
        createdAt = user.CreatedAt,
        updatedAt = user.UpdatedAt
    };
}

public record InviteUserRequest(
    [Required, EmailAddress] string Email,
    [Required] string Name,
    UserRole Role = UserRole.Member
);

public record UpdateRoleRequest([Required] UserRole Role);
