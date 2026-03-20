using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using Vyne.Core.Domain.Organizations;
using Vyne.Core.Domain.Users;
using Vyne.Core.Infrastructure.Data;
using Vyne.Core.Infrastructure.Events;
using Vyne.Core.Infrastructure.Repositories;
using Vyne.Core.Infrastructure.Services;

namespace Vyne.Core.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly IOrganizationRepository _orgRepo;
    private readonly IUserRepository _userRepo;
    private readonly ICognitoService _cognito;
    private readonly IEventPublisher _events;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IOrganizationRepository orgRepo,
        IUserRepository userRepo,
        ICognitoService cognito,
        IEventPublisher events,
        ILogger<AuthController> logger)
    {
        _orgRepo = orgRepo;
        _userRepo = userRepo;
        _cognito = cognito;
        _events = events;
        _logger = logger;
    }

    /// <summary>
    /// POST /auth/register — Create a new organization + owner user
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        // Validate slug availability
        var slug = request.OrganizationSlug.ToLowerInvariant().Trim();
        if (await _orgRepo.SlugExistsAsync(slug, ct))
        {
            return Conflict(new { error = new { code = "SLUG_TAKEN", message = "Organization slug is already taken" } });
        }

        // Check if Cognito user already exists
        if (await _cognito.UserExistsAsync(request.Email, ct))
        {
            return Conflict(new { error = new { code = "EMAIL_TAKEN", message = "Email is already registered" } });
        }

        // Create organization
        var org = Organization.Create(request.OrganizationName, slug);
        await _orgRepo.CreateAsync(org, ct);

        // Create Cognito user
        var tempPassword = Guid.NewGuid().ToString("N")[..12] + "Aa1!";
        var cognitoId = await _cognito.CreateUserAsync(
            request.Email,
            tempPassword,
            request.Name,
            org.Id.ToString(),
            "owner",
            ct);

        await _cognito.SetPermanentPasswordAsync(request.Email, request.Password, ct);

        // Create DB user
        var user = User.Create(org.Id, cognitoId, request.Email, request.Name, UserRole.Owner);
        await _userRepo.CreateAsync(user, ct);

        // Update Cognito with final org_id
        await _cognito.UpdateUserAttributesAsync(cognitoId, org.Id.ToString(), "owner", ct);

        _logger.LogInformation(
            "New organization registered: {OrgName} ({OrgId}) by {Email}",
            org.Name, org.Id, request.Email);

        return Created($"/orgs/{org.Id}", new
        {
            data = new
            {
                organization = MapOrg(org),
                user = MapUser(user)
            }
        });
    }

    /// <summary>
    /// GET /auth/me — Get current authenticated user + org
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var cognitoId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(cognitoId))
            return Unauthorized(new { error = new { code = "NO_SUB", message = "Token missing sub claim" } });

        var user = await _userRepo.GetByCognitoIdAsync(cognitoId, ct);
        if (user is null)
            return NotFound(new { error = new { code = "USER_NOT_FOUND", message = "User not found" } });

        return Ok(new
        {
            data = new
            {
                user = MapUser(user),
                organization = MapOrg(user.Organization)
            }
        });
    }

    private static object MapOrg(Organization org) => new
    {
        id = org.Id,
        name = org.Name,
        slug = org.Slug,
        logoUrl = org.LogoUrl,
        plan = org.Plan.ToString().ToLower(),
        maxMembers = org.MaxMembers,
        settings = org.Settings,
        createdAt = org.CreatedAt
    };

    private static object MapUser(User user) => new
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
        createdAt = user.CreatedAt
    };
}

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required, MinLength(2)] string Name,
    [Required, MinLength(2)] string OrganizationName,
    [Required, MinLength(2), MaxLength(50)] string OrganizationSlug
);
