using Microsoft.EntityFrameworkCore;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Infrastructure.Data;

namespace Vyne.Projects.Infrastructure.Repositories;

public interface ILabelRepository
{
    Task<List<Label>> ListByOrgAsync(Guid orgId, CancellationToken ct = default);
    Task<Label?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Label> CreateAsync(Label label, CancellationToken ct = default);
    Task AddToIssueAsync(Guid issueId, Guid labelId, CancellationToken ct = default);
    Task RemoveFromIssueAsync(Guid issueId, Guid labelId, CancellationToken ct = default);
}

public class LabelRepository : ILabelRepository
{
    private readonly ProjectsDbContext _db;

    public LabelRepository(ProjectsDbContext db) => _db = db;

    public async Task<List<Label>> ListByOrgAsync(Guid orgId, CancellationToken ct = default)
        => await _db.Labels
            .Where(l => l.OrgId == orgId)
            .OrderBy(l => l.Name)
            .ToListAsync(ct);

    public async Task<Label?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Labels.FirstOrDefaultAsync(l => l.Id == id, ct);

    public async Task<Label> CreateAsync(Label label, CancellationToken ct = default)
    {
        _db.Labels.Add(label);
        await _db.SaveChangesAsync(ct);
        return label;
    }

    public async Task AddToIssueAsync(Guid issueId, Guid labelId, CancellationToken ct = default)
    {
        var alreadyExists = await _db.IssueLabels
            .AnyAsync(il => il.IssueId == issueId && il.LabelId == labelId, ct);

        if (!alreadyExists)
        {
            _db.IssueLabels.Add(new IssueLabel { IssueId = issueId, LabelId = labelId });
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task RemoveFromIssueAsync(Guid issueId, Guid labelId, CancellationToken ct = default)
    {
        var link = await _db.IssueLabels
            .FirstOrDefaultAsync(il => il.IssueId == issueId && il.LabelId == labelId, ct);

        if (link is not null)
        {
            _db.IssueLabels.Remove(link);
            await _db.SaveChangesAsync(ct);
        }
    }
}
