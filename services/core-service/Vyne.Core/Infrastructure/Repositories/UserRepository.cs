using Microsoft.EntityFrameworkCore;
using Vyne.Core.Domain.Users;
using Vyne.Core.Infrastructure.Data;

namespace Vyne.Core.Infrastructure.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<User?> GetByCognitoIdAsync(string cognitoId, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(Guid orgId, string email, CancellationToken ct = default);
    Task<List<User>> GetByOrgAsync(Guid orgId, CancellationToken ct = default);
    Task<User> CreateAsync(User user, CancellationToken ct = default);
    Task<User> UpdateAsync(User user, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public class UserRepository : IUserRepository
{
    private readonly VyneDbContext _db;

    public UserRepository(VyneDbContext db)
    {
        _db = db;
    }

    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Users.Include(u => u.Organization).FirstOrDefaultAsync(u => u.Id == id, ct);

    public async Task<User?> GetByCognitoIdAsync(string cognitoId, CancellationToken ct = default)
        => await _db.Users.Include(u => u.Organization).FirstOrDefaultAsync(u => u.CognitoId == cognitoId, ct);

    public async Task<User?> GetByEmailAsync(Guid orgId, string email, CancellationToken ct = default)
        => await _db.Users.FirstOrDefaultAsync(u => u.OrgId == orgId && u.Email == email.ToLower(), ct);

    public async Task<List<User>> GetByOrgAsync(Guid orgId, CancellationToken ct = default)
        => await _db.Users.Where(u => u.OrgId == orgId).OrderBy(u => u.Name).ToListAsync(ct);

    public async Task<User> CreateAsync(User user, CancellationToken ct = default)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return user;
    }

    public async Task<User> UpdateAsync(User user, CancellationToken ct = default)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync(ct);
        return user;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _db.Users.FindAsync([id], ct);
        if (user is not null)
        {
            _db.Users.Remove(user);
            await _db.SaveChangesAsync(ct);
        }
    }
}
