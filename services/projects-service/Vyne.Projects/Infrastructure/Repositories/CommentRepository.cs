using Microsoft.EntityFrameworkCore;
using Vyne.Projects.Domain.Issues;
using Vyne.Projects.Infrastructure.Data;

namespace Vyne.Projects.Infrastructure.Repositories;

public interface ICommentRepository
{
    Task<List<IssueComment>> ListByIssueAsync(Guid issueId, CancellationToken ct = default);
    Task<IssueComment?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IssueComment> CreateAsync(IssueComment comment, CancellationToken ct = default);
    Task<IssueComment> UpdateAsync(IssueComment comment, CancellationToken ct = default);
}

public class CommentRepository : ICommentRepository
{
    private readonly ProjectsDbContext _db;

    public CommentRepository(ProjectsDbContext db) => _db = db;

    public async Task<List<IssueComment>> ListByIssueAsync(Guid issueId, CancellationToken ct = default)
        => await _db.Comments
            .Where(c => c.IssueId == issueId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(ct);

    public async Task<IssueComment?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Comments.FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<IssueComment> CreateAsync(IssueComment comment, CancellationToken ct = default)
    {
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync(ct);
        return comment;
    }

    public async Task<IssueComment> UpdateAsync(IssueComment comment, CancellationToken ct = default)
    {
        _db.Comments.Update(comment);
        await _db.SaveChangesAsync(ct);
        return comment;
    }
}
