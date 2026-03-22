using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Serilog;
using Vyne.ERP.Infrastructure.Data;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Vyne.ERP.Infrastructure.Middleware;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .Enrich.FromLogContext()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting Vyne ERP Service");

    var builder = WebApplication.CreateBuilder(args);

    builder.Configuration
        .AddJsonFile("appsettings.json", optional: false)
        .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
        .AddEnvironmentVariables();

    builder.Host.UseSerilog((ctx, svc, cfg) =>
    {
        cfg.ReadFrom.Configuration(ctx.Configuration)
           .ReadFrom.Services(svc)
           .Enrich.FromLogContext()
           .WriteTo.Console();
    });

    // ── Listen on port 5005 ───────────────────────────────────

    builder.WebHost.UseUrls("http://0.0.0.0:5005");

    // ── Database ──────────────────────────────────────────────

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

    builder.Services.AddDbContext<ERPDbContext>(options =>
    {
        options.UseNpgsql(connectionString, npgsql =>
        {
            npgsql.EnableRetryOnFailure(3);
        });
        if (builder.Environment.IsDevelopment())
        {
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
        }
    });

    // ── Auth (same JWT as core-service) ───────────────────────

    var jwtSecret = builder.Configuration["Jwt:Secret"];
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            if (builder.Environment.IsDevelopment() && !string.IsNullOrEmpty(jwtSecret))
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(5),
                };
            }
            else
            {
                options.Authority = $"https://cognito-idp.{builder.Configuration["Aws:Region"]}.amazonaws.com/{builder.Configuration["Cognito:UserPoolId"]}";
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateAudience = false,
                    ValidateLifetime = true,
                };
            }
        });

    builder.Services.AddAuthorization();

    // ── DI ────────────────────────────────────────────────────

    builder.Services.AddHttpContextAccessor();
    builder.Services.AddScoped<ITenantContext, TenantContext>();
    builder.Services.AddValidatorsFromAssemblyContaining<Program>();

    // ── Controllers ───────────────────────────────────────────

    builder.Services.AddControllers().AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy
                .WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                    ?? ["http://localhost:3000"])
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });

    builder.Services.AddHealthChecks()
        .AddNpgSql(connectionString, name: "postgres");

    // ── OpenTelemetry ─────────────────────────────────────────

    builder.Services.AddOpenTelemetry()
        .ConfigureResource(r => r.AddService("vyne-erp-service"))
        .WithTracing(t =>
        {
            t.AddAspNetCoreInstrumentation()
             .AddEntityFrameworkCoreInstrumentation();
            var ep = builder.Configuration["Otel:Endpoint"];
            if (!string.IsNullOrEmpty(ep))
                t.AddOtlpExporter(o => o.Endpoint = new Uri(ep));
        });

    var app = builder.Build();

    if (app.Environment.IsDevelopment())
    {
        using var scope = app.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<ERPDbContext>()
            .Database.MigrateAsync();
    }

    app.UseSerilogRequestLogging();

    app.UseExceptionHandler(e =>
    {
        e.Run(async ctx =>
        {
            ctx.Response.StatusCode = 500;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsJsonAsync(new
            {
                error = new { code = "INTERNAL_ERROR", message = "An unexpected error occurred." }
            });
        });
    });

    app.UseCors();
    app.UseAuthentication();
    app.UseMiddleware<TenantMiddleware>();
    app.UseAuthorization();

    app.MapControllers();
    app.MapHealthChecks("/health", new HealthCheckOptions
    {
        ResponseWriter = async (context, report) =>
        {
            context.Response.ContentType = "application/json";
            var hasPostgres = report.Entries.TryGetValue("postgres", out var pgEntry);
            var dbStatus = hasPostgres
                ? (pgEntry.Status == HealthStatus.Healthy ? "connected" : "disconnected")
                : "unknown";
            var overallStatus = report.Status == HealthStatus.Healthy ? "healthy" : "unhealthy";
            await context.Response.WriteAsJsonAsync(new
            {
                status = overallStatus,
                service = "erp-service",
                timestamp = DateTime.UtcNow.ToString("o"),
                version = "0.1.0",
                database = dbStatus,
            });
        }
    });

    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "ERP service terminated unexpectedly");
    throw;
}
finally
{
    await Log.CloseAndFlushAsync();
}
