using Amazon.CognitoIdentityProvider;
using Amazon.CognitoIdentityProvider.Model;

namespace Vyne.Core.Infrastructure.Services;

public interface ICognitoService
{
    Task<string> CreateUserAsync(string email, string tempPassword, string name, string orgId, string role, CancellationToken ct = default);
    Task SetPermanentPasswordAsync(string email, string password, CancellationToken ct = default);
    Task<bool> UserExistsAsync(string email, CancellationToken ct = default);
    Task DeleteUserAsync(string email, CancellationToken ct = default);
    Task UpdateUserAttributesAsync(string cognitoId, string orgId, string role, CancellationToken ct = default);
}

public class CognitoService : ICognitoService
{
    private readonly IAmazonCognitoIdentityProvider _cognito;
    private readonly IConfiguration _config;
    private readonly ILogger<CognitoService> _logger;

    public CognitoService(
        IAmazonCognitoIdentityProvider cognito,
        IConfiguration config,
        ILogger<CognitoService> logger)
    {
        _cognito = cognito;
        _config = config;
        _logger = logger;
    }

    private string UserPoolId => _config["Cognito:UserPoolId"]
        ?? throw new InvalidOperationException("Cognito:UserPoolId not configured");

    public async Task<string> CreateUserAsync(
        string email,
        string tempPassword,
        string name,
        string orgId,
        string role,
        CancellationToken ct = default)
    {
        var request = new AdminCreateUserRequest
        {
            UserPoolId = UserPoolId,
            Username = email,
            TemporaryPassword = tempPassword,
            MessageAction = MessageActionType.SUPPRESS, // Don't send Cognito email, we send our own
            UserAttributes =
            [
                new() { Name = "email", Value = email },
                new() { Name = "email_verified", Value = "true" },
                new() { Name = "name", Value = name },
                new() { Name = "custom:org_id", Value = orgId },
                new() { Name = "custom:role", Value = role },
            ]
        };

        try
        {
            var response = await _cognito.AdminCreateUserAsync(request, ct);
            return response.User.Username;
        }
        catch (UsernameExistsException)
        {
            throw new InvalidOperationException($"User with email {email} already exists in Cognito");
        }
    }

    public async Task SetPermanentPasswordAsync(string email, string password, CancellationToken ct = default)
    {
        await _cognito.AdminSetUserPasswordAsync(new AdminSetUserPasswordRequest
        {
            UserPoolId = UserPoolId,
            Username = email,
            Password = password,
            Permanent = true
        }, ct);
    }

    public async Task<bool> UserExistsAsync(string email, CancellationToken ct = default)
    {
        try
        {
            await _cognito.AdminGetUserAsync(new AdminGetUserRequest
            {
                UserPoolId = UserPoolId,
                Username = email
            }, ct);
            return true;
        }
        catch (UserNotFoundException)
        {
            return false;
        }
    }

    public async Task DeleteUserAsync(string email, CancellationToken ct = default)
    {
        await _cognito.AdminDeleteUserAsync(new AdminDeleteUserRequest
        {
            UserPoolId = UserPoolId,
            Username = email
        }, ct);
    }

    public async Task UpdateUserAttributesAsync(string cognitoId, string orgId, string role, CancellationToken ct = default)
    {
        await _cognito.AdminUpdateUserAttributesAsync(new AdminUpdateUserAttributesRequest
        {
            UserPoolId = UserPoolId,
            Username = cognitoId,
            UserAttributes =
            [
                new() { Name = "custom:org_id", Value = orgId },
                new() { Name = "custom:role", Value = role }
            ]
        }, ct);
    }
}
