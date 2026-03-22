using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Serilog;
using Vyne.Projects.Infrastructure.Data;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Vyne.Projects.Infrastructure.Events;
using Vyne.Projects.Infrastructure.Middleware;
using Vyne.Projects.Infrastructure.Repositories;
using Vyne.Projects.Domain.Docs;
using Vyne.Projects.Infrastructure.Services;
using Vyne.Projects.Hubs;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .Enrich.FromLogContext()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting Vyne Projects Service");

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

    // ── Database ──────────────────────────────────────────────

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string not found.");

    builder.Services.AddDbContext<ProjectsDbContext>(options =>
    {
        options.UseNpgsql(connectionString, npgsql =>
        {
            npgsql.EnableRetryOnFailure(3);
            npgsql.UseVector(); // pgvector extension
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
    builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
    builder.Services.AddScoped<IIssueRepository, IssueRepository>();
    builder.Services.AddScoped<ISprintRepository, SprintRepository>();
    builder.Services.AddScoped<ICommentRepository, CommentRepository>();
    builder.Services.AddScoped<ILabelRepository, LabelRepository>();
    builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();
    builder.Services.AddScoped<IEventPublisher, EventBridgePublisher>();
    builder.Services.AddScoped<IBedrockEmbeddingService, BedrockEmbeddingService>();
    builder.Services.AddHostedService<IssueEmbeddingWorker>();
    builder.Services.AddValidatorsFromAssemblyContaining<Program>();

    // ── SignalR ───────────────────────────────────────────────

    builder.Services.AddSignalR(options =>
    {
        options.EnableDetailedErrors = builder.Environment.IsDevelopment();
        options.MaximumReceiveMessageSize = 64 * 1024; // 64KB
    });

    // ── Controllers ───────────────────────────────────────────

    builder.Services.AddControllers().AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
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
        .ConfigureResource(r => r.AddService("vyne-projects-service"))
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
        await scope.ServiceProvider.GetRequiredService<ProjectsDbContext>()
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
    app.MapHub<ProjectsHub>("/hubs/projects");
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
                service = "projects-service",
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
    Log.Fatal(ex, "Projects service terminated unexpectedly");
    throw;
}
finally
{
    await Log.CloseAndFlushAsync();
}
