using Microsoft.EntityFrameworkCore;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Infrastructure.Data;

namespace Vyne.Projects.Infrastructure.Repositories;

public record IssueFilters(
    Guid ProjectId,
    string? Status = null,
    string? Priority = null,
    Guid? AssigneeId = null,
    Guid? LabelId = null,
    Guid? SprintId = null,
    string? Q = null,
    string SortBy = "position",
    string SortDir = "asc",
    int Page = 1,
    int Limit = 50);

public record PagedResult<T>(List<T> Items, int Total, int Page, int Limit);

public interface IIssueRepository
{
    Task<PagedResult<Issue>> ListAsync(IssueFilters filters, CancellationToken ct = default);
    Task<Issue?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Issue?> GetByIdentifierAsync(Guid orgId, string identifier, CancellationToken ct = default);
    Task<string> NextIdentifierAsync(Guid projectId, string projectIdentifier, CancellationToken ct = default);
    Task<decimal> NextPositionAsync(Guid projectId, CancellationToken ct = default);
    Task<Issue> CreateAsync(Issue issue, CancellationToken ct = default);
    Task<Issue> UpdateAsync(Issue issue, CancellationToken ct = default);
    Task AddActivityAsync(IssueActivity activity, CancellationToken ct = default);
    Task ReorderAsync(List<(Guid Id, decimal Position)> updates, CancellationToken ct = default);
    Task<List<Issue>> SearchAsync(Guid orgId, string query, int limit, CancellationToken ct = default);
}

public class IssueRepository : IIssueRepository
{
    private readonly ProjectsDbContext _db;
    public IssueRepository(ProjectsDbContext db) => _db = db;

    public async Task<PagedResult<Issue>> ListAsync(IssueFilters f, CancellationToken ct = default)
    {
        var query = _db.Issues
            .Include(i => i.Labels).ThenInclude(il => il.Label)
            .Where(i => i.ProjectId == f.ProjectId);

        if (!string.IsNullOrEmpty(f.Status) && Enum.TryParse<IssueStatus>(f.Status, true, out var status))
            query = query.Where(i => i.Status == status);

        if (!string.IsNullOrEmpty(f.Priority) && Enum.TryParse<IssuePriority>(f.Priority, true, out var priority))
            query = query.Where(i => i.Priority == priority);

        if (f.AssigneeId.HasValue) query = query.Where(i => i.AssigneeId == f.AssigneeId);
        if (f.SprintId.HasValue)   query = query.Where(i => i.SprintId == f.SprintId);
        if (f.LabelId.HasValue)    query = query.Where(i => i.Labels.Any(il => il.LabelId == f.LabelId));

        if (!string.IsNullOrEmpty(f.Q))
            query = query.Where(i => EF.Functions.ILike(i.Title, $"%{f.Q}%")
                || (i.Description != null && EF.Functions.ILike(i.Description, $"%{f.Q}%")));

        var total = await query.CountAsync(ct);

        query = (f.SortBy, f.SortDir.ToLower()) switch
        {
            ("priority", "asc")    => query.OrderBy(i => i.Priority),
            ("priority", _)        => query.OrderByDescending(i => i.Priority),
            ("status", "asc")      => query.OrderBy(i => i.Status),
            ("status", _)          => query.OrderByDescending(i => i.Status),
            ("createdAt", "desc")  => query.OrderByDescending(i => i.CreatedAt),
            ("updatedAt", "desc")  => query.OrderByDescending(i => i.UpdatedAt),
            _                      => query.OrderBy(i => i.Position)
        };

        var items = await query
            .Skip((f.Page - 1) * f.Limit)
            .Take(f.Limit)
            .ToListAsync(ct);

        return new PagedResult<Issue>(items, total, f.Page, f.Limit);
    }

    public async Task<Issue?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Issues
            .Include(i => i.Labels).ThenInclude(il => il.Label)
            .Include(i => i.Comments.Where(c => c.DeletedAt == null))
            .Include(i => i.Activities.OrderByDescending(a => a.CreatedAt).Take(50))
            .FirstOrDefaultAsync(i => i.Id == id, ct);

    public async Task<Issue?> GetByIdentifierAsync(Guid orgId, string identifier, CancellationToken ct = default)
        => await _db.Issues.FirstOrDefaultAsync(i => i.OrgId == orgId && i.Identifier == identifier, ct);

    public async Task<string> NextIdentifierAsync(Guid projectId, string projectIdentifier, CancellationToken ct = default)
    {
        // Atomic increment using a FOR UPDATE lock
        var counter = await _db.IssueCounters
            .FromSqlRaw("SELECT * FROM project_issue_counters WHERE project_id = {0} FOR UPDATE", projectId)
            .FirstOrDefaultAsync(ct)
            ?? new ProjectIssueCounter { ProjectId = projectId, NextNumber = 1 };

        var number = counter.NextNumber;
        counter.NextNumber++;

        if (_db.Entry(counter).State == Microsoft.EntityFrameworkCore.EntityState.Detached)
            _db.IssueCounters.Add(counter);

        await _db.SaveChangesAsync(ct);
        return $"{projectIdentifier}-{number}";
    }

    public async Task<decimal> NextPositionAsync(Guid projectId, CancellationToken ct = default)
    {
        var maxPos = await _db.Issues
            .Where(i => i.ProjectId == projectId)
            .MaxAsync(i => (decimal?)i.Position, ct);
        return (maxPos ?? 0m) + 1m;
    }

    public async Task<Issue> CreateAsync(Issue issue, CancellationToken ct = default)
    {
        _db.Issues.Add(issue);
        await _db.SaveChangesAsync(ct);
        return issue;
    }

    public async Task<Issue> UpdateAsync(Issue issue, CancellationToken ct = default)
    {
        _db.Issues.Update(issue);
        await _db.SaveChangesAsync(ct);
        return issue;
    }

    public async Task AddActivityAsync(IssueActivity activity, CancellationToken ct = default)
    {
        _db.Activities.Add(activity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task ReorderAsync(List<(Guid Id, decimal Position)> updates, CancellationToken ct = default)
    {
        // Batch update positions
        foreach (var (id, pos) in updates)
        {
            await _db.Database.ExecuteSqlRawAsync(
                "UPDATE issues SET position = {0}, updated_at = NOW() WHERE id = {1}",
                pos, id);
        }
    }

    public async Task<List<Issue>> SearchAsync(Guid orgId, string query, int limit, CancellationToken ct = default)
    {
        // Full-text search using PostgreSQL tsvector
        return await _db.Issues
            .Where(i => i.OrgId == orgId && EF.Functions.ToTsVector("english", i.Title)
                .Matches(EF.Functions.PlainToTsQuery("english", query)))
            .OrderByDescending(i => i.UpdatedAt)
            .Take(limit)
            .ToListAsync(ct);
    }
}
