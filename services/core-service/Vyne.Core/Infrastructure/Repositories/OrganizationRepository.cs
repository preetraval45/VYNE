using Microsoft.EntityFrameworkCore;
using Vyne.Core.Domain.Organizations;
using Vyne.Core.Infrastructure.Data;

namespace Vyne.Core.Infrastructure.Repositories;

public interface IOrganizationRepository
{
    Task<Organization?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Organization?> GetBySlugAsync(string slug, CancellationToken ct = default);
    Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default);
    Task<Organization> CreateAsync(Organization org, CancellationToken ct = default);
    Task<Organization> UpdateAsync(Organization org, CancellationToken ct = default);
}

public class OrganizationRepository : IOrganizationRepository
{
    private readonly VyneDbContext _db;

    public OrganizationRepository(VyneDbContext db)
    {
        _db = db;
    }

    public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Organizations.FirstOrDefaultAsync(o => o.Id == id, ct);

    public async Task<Organization?> GetBySlugAsync(string slug, CancellationToken ct = default)
        => await _db.Organizations.FirstOrDefaultAsync(o => o.Slug == slug, ct);

    public async Task<bool> SlugExistsAsync(string slug, CancellationToken ct = default)
        => await _db.Organizations.AnyAsync(o => o.Slug == slug, ct);

    public async Task<Organization> CreateAsync(Organization org, CancellationToken ct = default)
    {
        _db.Organizations.Add(org);
        await _db.SaveChangesAsync(ct);
        return org;
    }

    public async Task<Organization> UpdateAsync(Organization org, CancellationToken ct = default)
    {
        _db.Organizations.Update(org);
        await _db.SaveChangesAsync(ct);
        return org;
    }
}
