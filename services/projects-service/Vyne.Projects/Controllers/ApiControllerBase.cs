using Microsoft.AspNetCore.Mvc;
using Vyne.Projects.Infrastructure.Data;

namespace Vyne.Projects.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    // ── Error codes ──────────────────────────────────────────────────────────

    protected const string ErrUnauthorized   = "UNAUTHORIZED";
    protected const string ErrNotFound       = "NOT_FOUND";
    protected const string ErrValidation     = "VALIDATION_ERROR";
    protected const string ErrConflict       = "IDENTIFIER_CONFLICT";
    protected const string ErrLabelConflict  = "LABEL_CONFLICT";
    protected const string ErrArchived       = "ARCHIVED";
    protected const string ErrInvalidState   = "INVALID_STATE";
    protected const string ErrInternal       = "INTERNAL_ERROR";

    // ── Common messages ──────────────────────────────────────────────────────

    protected const string MsgTenantUnavailable = "Tenant context not available.";
    protected const string MsgUserUnavailable   = "User context not available.";

    // ── Tenant helpers ───────────────────────────────────────────────────────

    protected bool TryGetOrgId(ITenantContext tenant, out Guid orgId)
    {
        if (tenant.OrgId is { } id)
        {
            orgId = id;
            return true;
        }
        orgId = default;
        return false;
    }

    protected bool TryGetUserId(ITenantContext tenant, out Guid userId)
    {
        if (tenant.UserId is { } id)
        {
            userId = id;
            return true;
        }
        userId = default;
        return false;
    }

    // ── Response factories ───────────────────────────────────────────────────

    protected static object ErrorBody(string code, string message) =>
        new { error = new { code, message } };

    protected IActionResult TenantError() =>
        Unauthorized(ErrorBody(ErrUnauthorized, MsgTenantUnavailable));

    protected IActionResult UserError() =>
        Unauthorized(ErrorBody(ErrUnauthorized, MsgUserUnavailable));
}
