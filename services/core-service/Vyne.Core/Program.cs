using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Serilog;
using Vyne.Core.Infrastructure.Data;
using Vyne.Core.Infrastructure.Events;
using Vyne.Core.Infrastructure.Middleware;
using Vyne.Core.Infrastructure.Repositories;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Vyne.Core.Infrastructure.Services;

// ── Bootstrap Serilog ─────────────────────────────────────────

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .Enrich.FromLogContext()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting Vyne Core Service");

    var builder = WebApplication.CreateBuilder(args);

    // ── Configuration ─────────────────────────────────────────────

    builder.Configuration
        .AddJsonFile("appsettings.json", optional: false)
        .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true)
        .AddEnvironmentVariables();

    // Load secrets from AWS Secrets Manager in non-development environments
    if (!builder.Environment.IsDevelopment())
    {
        var secretsService = new AwsSecretsService(builder.Configuration);
        await secretsService.LoadSecretsAsync(builder.Configuration);
    }

    // ── Serilog ───────────────────────────────────────────────────

    builder.Host.UseSerilog((context, services, configuration) =>
    {
        configuration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithEnvironmentName()
            .WriteTo.Console(outputTemplate:
                "[{Timestamp:HH:mm:ss} {Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}");
    });

    // ── Database ──────────────────────────────────────────────────

    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

    builder.Services.AddDbContext<VyneDbContext>(options =>
    {
        options.UseNpgsql(connectionString, npgsql =>
        {
            npgsql.EnableRetryOnFailure(maxRetryCount: 3);
            npgsql.CommandTimeout(30);
        });
        if (builder.Environment.IsDevelopment())
        {
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
        }
    });

    // ── Authentication (JWT from Cognito) ─────────────────────────

    var jwtSettings = builder.Configuration.GetSection("Jwt");
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.Authority = $"https://cognito-idp.{builder.Configuration["Aws:Region"]}.amazonaws.com/{builder.Configuration["Cognito:UserPoolId"]}";
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                ValidateIssuer = true,
                ValidateAudience = false, // Cognito tokens don't have audience by default
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(5),
            };
            // For local dev, allow symmetric JWT
            if (builder.Environment.IsDevelopment())
            {
                var secret = jwtSettings["Secret"] ?? "local_dev_jwt_secret_at_least_64_chars_long_for_hmac_sha256";
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(5),
                };
            }
        });

    builder.Services.AddAuthorization();

    // ── HTTP Clients ──────────────────────────────────────────────

    builder.Services.AddHttpContextAccessor();

    // ── DI Registrations ─────────────────────────────────────────

    builder.Services.AddScoped<IOrganizationRepository, OrganizationRepository>();
    builder.Services.AddScoped<IUserRepository, UserRepository>();
    builder.Services.AddScoped<IEventPublisher, EventBridgePublisher>();
    builder.Services.AddScoped<ICognitoService, CognitoService>();
    builder.Services.AddScoped<ITenantContext, TenantContext>();
    builder.Services.AddValidatorsFromAssemblyContaining<Program>();

    // ── Controllers ───────────────────────────────────────────────

    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            options.JsonSerializerOptions.DefaultIgnoreCondition =
                System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        });

    // ── CORS ──────────────────────────────────────────────────────

    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy
                .WithOrigins(
                    builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                    ?? ["http://localhost:3000"])
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
    });

    // ── Health Checks ─────────────────────────────────────────────

    builder.Services.AddHealthChecks()
        .AddNpgSql(connectionString, name: "postgres");

    // ── OpenTelemetry ─────────────────────────────────────────────

    builder.Services.AddOpenTelemetry()
        .ConfigureResource(resource => resource
            .AddService("vyne-core-service")
            .AddAttributes(new Dictionary<string, object>
            {
                ["environment"] = builder.Environment.EnvironmentName,
            }))
        .WithTracing(tracing =>
        {
            tracing
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddEntityFrameworkCoreInstrumentation();

            var otlpEndpoint = builder.Configuration["Otel:Endpoint"];
            if (!string.IsNullOrEmpty(otlpEndpoint))
            {
                tracing.AddOtlpExporter(o => o.Endpoint = new Uri(otlpEndpoint));
            }
        })
        .WithMetrics(metrics =>
        {
            metrics.AddAspNetCoreInstrumentation();
        });

    // ── Build & Configure Pipeline ────────────────────────────────

    var app = builder.Build();

    // Run migrations on startup in development
    if (app.Environment.IsDevelopment())
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VyneDbContext>();
        await db.Database.MigrateAsync();
    }

    app.UseSerilogRequestLogging(options =>
    {
        options.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000}ms";
    });

    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            context.Response.StatusCode = 500;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
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
                service = "core-service",
                timestamp = DateTime.UtcNow.ToString("o"),
                version = "0.1.0",
                database = dbStatus,
            });
        }
    });

    Log.Information("Vyne Core Service started on {Urls}", string.Join(", ", app.Urls));
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Core service terminated unexpectedly");
    throw;
}
finally
{
    await Log.CloseAndFlushAsync();
}
