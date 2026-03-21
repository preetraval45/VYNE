using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Infrastructure.Middleware;

public class TenantMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantMiddleware> _logger;

    public TenantMiddleware(RequestDelegate next, ILogger<TenantMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ERPDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var orgIdClaim = context.User.FindFirst("custom:org_id")?.Value
                ?? context.User.FindFirst("org_id")?.Value;

            if (!string.IsNullOrEmpty(orgIdClaim) && Guid.TryParse(orgIdClaim, out var orgId))
            {
                context.Items["org_id"] = orgId.ToString();

                try
                {
                    // Set the PostgreSQL session variable used by RLS policies
                    await db.Database.ExecuteSqlRawAsync(
                        "SELECT set_config('app.current_org_id', {0}, true)",
                        orgId.ToString());
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to set tenant context for org {OrgId}", orgId);
                    context.Response.StatusCode = 503;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        error = new { code = "TENANT_CONTEXT_ERROR", message = "Failed to establish tenant context." }
                    });
                    return;
                }
            }
        }

        await _next(context);
    }
}
