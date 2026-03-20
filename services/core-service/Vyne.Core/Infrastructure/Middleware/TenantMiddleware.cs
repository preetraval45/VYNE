using Microsoft.EntityFrameworkCore;
using Vyne.Core.Infrastructure.Data;

namespace Vyne.Core.Infrastructure.Middleware;

/// <summary>
/// Extracts org_id from the JWT claim and sets the PostgreSQL session variable
/// app.current_org_id so that Row-Level Security policies are enforced.
/// </summary>
public class TenantMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantMiddleware> _logger;

    public TenantMiddleware(RequestDelegate next, ILogger<TenantMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, VyneDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var orgIdClaim = context.User.FindFirst("custom:org_id")?.Value
                ?? context.User.FindFirst("org_id")?.Value;

            if (!string.IsNullOrEmpty(orgIdClaim) && Guid.TryParse(orgIdClaim, out var orgId))
            {
                // Store in HttpContext.Items for other middleware/services
                context.Items["org_id"] = orgId.ToString();

                // Set PostgreSQL session variable for RLS
                // This must be done before any query in this request
                try
                {
                    await db.Database.ExecuteSqlRawAsync(
                        "SELECT set_config('app.current_org_id', {0}, true)",
                        orgId.ToString());
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to set tenant context for org {OrgId}", orgId);
                    context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        error = new { code = "TENANT_CONTEXT_ERROR", message = "Failed to establish tenant context" }
                    });
                    return;
                }
            }
            else if (!IsPublicEndpoint(context.Request.Path))
            {
                _logger.LogWarning(
                    "Authenticated request missing org_id claim. Path: {Path}, User: {User}",
                    context.Request.Path,
                    context.User.FindFirst("sub")?.Value);
            }
        }

        await _next(context);
    }

    private static bool IsPublicEndpoint(PathString path)
    {
        var publicPaths = new[] { "/health", "/auth/register", "/auth/login" };
        return publicPaths.Any(p => path.StartsWithSegments(p));
    }
}
