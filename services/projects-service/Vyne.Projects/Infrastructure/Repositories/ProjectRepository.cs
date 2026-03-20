using Microsoft.EntityFrameworkCore;
using Vyne.Projects.Domain.Projects;
using Vyne.Projects.Infrastructure.Data;

namespace Vyne.Projects.Infrastructure.Repositories;

public interface IProjectRepository
{
    Task<List<Project>> ListAsync(Guid orgId, CancellationToken ct = default);
    Task<Project?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<bool> IdentifierExistsAsync(Guid orgId, string identifier, CancellationToken ct = default);
    Task<Project> CreateAsync(Project project, CancellationToken ct = default);
    Task<Project> UpdateAsync(Project project, CancellationToken ct = default);
}

public class ProjectRepository : IProjectRepository
{
    private readonly ProjectsDbContext _db;
    public ProjectRepository(ProjectsDbContext db) => _db = db;

    public async Task<List<Project>> ListAsync(Guid orgId, CancellationToken ct = default)
        => await _db.Projects
            .Where(p => p.OrgId == orgId && p.Status != ProjectStatus.Archived)
            .OrderBy(p => p.CreatedAt)
            .ToListAsync(ct);

    public async Task<Project?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Projects
            .Include(p => p.Issues.Where(i => i.DeletedAt == null))
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<bool> IdentifierExistsAsync(Guid orgId, string identifier, CancellationToken ct = default)
        => await _db.Projects.AnyAsync(p => p.OrgId == orgId && p.Identifier == identifier.ToUpperInvariant(), ct);

    public async Task<Project> CreateAsync(Project project, CancellationToken ct = default)
    {
        _db.Projects.Add(project);
        _db.IssueCounters.Add(new ProjectIssueCounter { ProjectId = project.Id, NextNumber = 1 });
        await _db.SaveChangesAsync(ct);
        return project;
    }

    public async Task<Project> UpdateAsync(Project project, CancellationToken ct = default)
    {
        _db.Projects.Update(project);
        await _db.SaveChangesAsync(ct);
        return project;
    }
}
