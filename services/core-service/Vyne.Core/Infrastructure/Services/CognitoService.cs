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

    /// <summary>
    /// Initiates a forgot-password flow in Cognito, which sends a verification code to the user's email.
    /// </summary>
    Task ForgotPasswordAsync(string email, CancellationToken ct = default);

    /// <summary>
    /// Confirms the forgot-password flow by providing the verification code and the new password.
    /// </summary>
    Task ConfirmForgotPasswordAsync(string email, string confirmationCode, string newPassword, CancellationToken ct = default);

    /// <summary>
    /// Refreshes an access token using a Cognito refresh token.
    /// Returns new (IdToken, AccessToken, RefreshToken) — note: Cognito may not always return a new refresh token.
    /// </summary>
    Task<CognitoTokenResult> RefreshTokenAsync(string refreshToken, CancellationToken ct = default);
}

public record CognitoTokenResult(string IdToken, string AccessToken, string? RefreshToken);

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

    private string ClientId => _config["Cognito:ClientId"]
        ?? throw new InvalidOperationException("Cognito:ClientId not configured");

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

    public async Task ForgotPasswordAsync(string email, CancellationToken ct = default)
    {
        try
        {
            await _cognito.ForgotPasswordAsync(new ForgotPasswordRequest
            {
                ClientId = ClientId,
                Username = email,
            }, ct);

            _logger.LogInformation("Forgot-password flow initiated for {Email}", email);
        }
        catch (UserNotFoundException)
        {
            // Silently succeed to avoid email enumeration attacks
            _logger.LogWarning("Forgot-password requested for non-existent user {Email}", email);
        }
        catch (LimitExceededException)
        {
            throw new InvalidOperationException("Too many password reset attempts. Please try again later.");
        }
    }

    public async Task ConfirmForgotPasswordAsync(
        string email,
        string confirmationCode,
        string newPassword,
        CancellationToken ct = default)
    {
        try
        {
            await _cognito.ConfirmForgotPasswordAsync(new ConfirmForgotPasswordRequest
            {
                ClientId = ClientId,
                Username = email,
                ConfirmationCode = confirmationCode,
                Password = newPassword,
            }, ct);

            _logger.LogInformation("Password reset confirmed for {Email}", email);
        }
        catch (CodeMismatchException)
        {
            throw new InvalidOperationException("Invalid or expired reset code. Please request a new password reset.");
        }
        catch (ExpiredCodeException)
        {
            throw new InvalidOperationException("Reset code has expired. Please request a new password reset.");
        }
        catch (InvalidPasswordException ex)
        {
            throw new InvalidOperationException($"Password does not meet requirements: {ex.Message}");
        }
    }

    public async Task<CognitoTokenResult> RefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        try
        {
            var response = await _cognito.AdminInitiateAuthAsync(new AdminInitiateAuthRequest
            {
                UserPoolId = UserPoolId,
                ClientId = ClientId,
                AuthFlow = AuthFlowType.REFRESH_TOKEN_AUTH,
                AuthParameters = new Dictionary<string, string>
                {
                    ["REFRESH_TOKEN"] = refreshToken
                }
            }, ct);

            var result = response.AuthenticationResult;

            return new CognitoTokenResult(
                IdToken: result.IdToken,
                AccessToken: result.AccessToken,
                // Cognito does not always return a new refresh token on refresh;
                // if it doesn't, the caller should keep using the existing one.
                RefreshToken: result.RefreshToken
            );
        }
        catch (NotAuthorizedException)
        {
            throw new InvalidOperationException("Refresh token is invalid or expired. Please sign in again.");
        }
        catch (UserNotFoundException)
        {
            throw new InvalidOperationException("User not found. Please sign in again.");
        }
    }
}
