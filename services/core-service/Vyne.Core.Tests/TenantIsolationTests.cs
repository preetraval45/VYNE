using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using Vyne.Core.Domain.Organizations;
using Vyne.Core.Domain.Users;
using Vyne.Core.Infrastructure.Data;
using Xunit;

namespace Vyne.Core.Tests;

/// <summary>
/// Proves cross-tenant data isolation using Testcontainers PostgreSQL.
/// These tests use a real database with RLS enabled — not mocks.
/// </summary>
public class TenantIsolationTests : IAsyncLifetime
{
    private Testcontainers.PostgreSql.PostgreSqlContainer _postgres = null!;
    private string _connectionString = string.Empty;

    public async Task InitializeAsync()
    {
        _postgres = new Testcontainers.PostgreSql.PostgreSqlBuilder()
            .WithImage("pgvector/pgvector:pg17")
            .WithDatabase("vyne_test")
            .WithUsername("vyne")
            .WithPassword("test_password")
            .Build();

        await _postgres.StartAsync();
        _connectionString = _postgres.GetConnectionString();

        // Run migrations
        await using var context = CreateContext(Guid.Empty); // No tenant for setup
        await context.Database.EnsureCreatedAsync();

        // Apply RLS policies (simplified — in real tests, run the migration SQL)
        await context.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
            ALTER TABLE users ENABLE ROW LEVEL SECURITY;

            CREATE POLICY IF NOT EXISTS orgs_rls ON organizations
                USING (id = current_setting('app.current_org_id', true)::uuid);

            CREATE POLICY IF NOT EXISTS users_rls ON users
                USING (org_id = current_setting('app.current_org_id', true)::uuid);
        ");
    }

    public async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task CrossTenant_UsersCannotSeeOtherOrgData()
    {
        // Arrange — create two orgs and users
        var org1 = Organization.Create("Org One", "org-one");
        var org2 = Organization.Create("Org Two", "org-two");

        await using var adminCtx = CreateContext(Guid.Empty);
        adminCtx.Organizations.AddRange(org1, org2);

        var user1 = User.Create(org1.Id, "cognito-1", "user1@org1.com", "User One");
        var user2 = User.Create(org2.Id, "cognito-2", "user2@org2.com", "User Two");
        adminCtx.Users.AddRange(user1, user2);
        await adminCtx.SaveChangesAsync();

        // Act — query as tenant 1
        await using var tenant1Ctx = CreateContext(org1.Id);
        var usersVisibleToTenant1 = await tenant1Ctx.Users.ToListAsync();

        // Act — query as tenant 2
        await using var tenant2Ctx = CreateContext(org2.Id);
        var usersVisibleToTenant2 = await tenant2Ctx.Users.ToListAsync();

        // Assert — each tenant sees only their own users
        usersVisibleToTenant1.Should().HaveCount(1);
        usersVisibleToTenant1.Single().Email.Should().Be("user1@org1.com");

        usersVisibleToTenant2.Should().HaveCount(1);
        usersVisibleToTenant2.Single().Email.Should().Be("user2@org2.com");
    }

    [Fact]
    public async Task CrossTenant_CannotReadOtherOrganization()
    {
        // Arrange
        var org1 = Organization.Create("Org Alpha", "org-alpha");
        var org2 = Organization.Create("Org Beta", "org-beta");

        await using var adminCtx = CreateContext(Guid.Empty);
        adminCtx.Organizations.AddRange(org1, org2);
        await adminCtx.SaveChangesAsync();

        // Act — as tenant 1, try to see org 2
        await using var tenant1Ctx = CreateContext(org1.Id);
        var orgs = await tenant1Ctx.Organizations.ToListAsync();

        // Assert — only sees own org
        orgs.Should().HaveCount(1);
        orgs.Single().Id.Should().Be(org1.Id);
    }

    private VyneDbContext CreateContext(Guid orgId)
    {
        var options = new DbContextOptionsBuilder<VyneDbContext>()
            .UseNpgsql(_connectionString)
            .Options;

        var tenantContext = Substitute.For<ITenantContext>();
        tenantContext.OrgId.Returns(orgId == Guid.Empty ? (Guid?)null : orgId);

        var ctx = new VyneDbContext(options, tenantContext);

        // Set PostgreSQL session variable if we have a tenant
        if (orgId != Guid.Empty)
        {
            ctx.Database.ExecuteSqlRaw(
                $"SELECT set_config('app.current_org_id', '{orgId}', true)");
        }

        return ctx;
    }
}

[CollectionDefinition("Integration")]
public class IntegrationCollection : ICollectionFixture<TenantIsolationTests> { }
