using Microsoft.EntityFrameworkCore;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Infrastructure.Data;

namespace Vyne.Projects.Infrastructure.Repositories;

public interface ISprintRepository
{
    Task<List<Sprint>> ListByProjectAsync(Guid projectId, CancellationToken ct = default);
    Task<Sprint?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Sprint> CreateAsync(Sprint sprint, CancellationToken ct = default);
    Task<Sprint> UpdateAsync(Sprint sprint, CancellationToken ct = default);
    Task<List<Issue>> GetIncompleteIssuesAsync(Guid sprintId, CancellationToken ct = default);
}

public class SprintRepository : ISprintRepository
{
    private readonly ProjectsDbContext _db;

    public SprintRepository(ProjectsDbContext db) => _db = db;

    public async Task<List<Sprint>> ListByProjectAsync(Guid projectId, CancellationToken ct = default)
        => await _db.Sprints
            .Where(s => s.ProjectId == projectId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);

    public async Task<Sprint?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Sprints
            .Include(s => s.Issues)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

    public async Task<Sprint> CreateAsync(Sprint sprint, CancellationToken ct = default)
    {
        _db.Sprints.Add(sprint);
        await _db.SaveChangesAsync(ct);
        return sprint;
    }

    public async Task<Sprint> UpdateAsync(Sprint sprint, CancellationToken ct = default)
    {
        _db.Sprints.Update(sprint);
        await _db.SaveChangesAsync(ct);
        return sprint;
    }

    public async Task<List<Issue>> GetIncompleteIssuesAsync(Guid sprintId, CancellationToken ct = default)
        => await _db.Issues
            .Where(i => i.SprintId == sprintId
                && i.Status != IssueStatus.Done
                && i.Status != IssueStatus.Cancelled)
            .ToListAsync(ct);
}
