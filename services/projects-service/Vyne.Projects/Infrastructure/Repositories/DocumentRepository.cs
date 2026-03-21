using Microsoft.EntityFrameworkCore;
using Vyne.Projects.Domain.Docs;
using Vyne.Projects.Infrastructure.Data;

namespace Vyne.Projects.Infrastructure.Repositories;

public interface IDocumentRepository
{
    Task<List<Document>> ListRootAsync(Guid orgId, CancellationToken ct = default);
    Task<List<Document>> ListChildrenAsync(Guid orgId, Guid parentId, CancellationToken ct = default);
    Task<Document?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Document?> GetByIdWithContentAsync(Guid id, CancellationToken ct = default);
    Task<int> GetNextVersionAsync(Guid documentId, CancellationToken ct = default);
    Task<Document> CreateAsync(Document document, CancellationToken ct = default);
    Task<Document> UpdateAsync(Document document, CancellationToken ct = default);
    Task<DocumentVersion> AddVersionAsync(DocumentVersion version, CancellationToken ct = default);
    Task<List<Document>> SearchAsync(Guid orgId, string query, int limit, CancellationToken ct = default);
    Task<List<Document>> ListRecentAsync(Guid orgId, int limit, CancellationToken ct = default);
}

public class DocumentRepository : IDocumentRepository
{
    private readonly ProjectsDbContext _db;
    public DocumentRepository(ProjectsDbContext db) => _db = db;

    public async Task<List<Document>> ListRootAsync(Guid orgId, CancellationToken ct = default)
        => await _db.Documents
            .Where(d => d.OrgId == orgId && d.ParentId == null)
            .OrderBy(d => d.Position)
            .ThenBy(d => d.CreatedAt)
            .ToListAsync(ct);

    public async Task<List<Document>> ListChildrenAsync(Guid orgId, Guid parentId, CancellationToken ct = default)
        => await _db.Documents
            .Where(d => d.OrgId == orgId && d.ParentId == parentId)
            .OrderBy(d => d.Position)
            .ThenBy(d => d.CreatedAt)
            .ToListAsync(ct);

    public async Task<Document?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _db.Documents.FirstOrDefaultAsync(d => d.Id == id, ct);

    public async Task<Document?> GetByIdWithContentAsync(Guid id, CancellationToken ct = default)
    {
        var doc = await _db.Documents.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (doc is null) return null;

        var latestVersion = await _db.DocumentVersions
            .Where(v => v.DocumentId == id)
            .OrderByDescending(v => v.Version)
            .FirstOrDefaultAsync(ct);

        if (latestVersion is not null)
            doc.SetContent(latestVersion.Content);

        return doc;
    }

    public async Task<int> GetNextVersionAsync(Guid documentId, CancellationToken ct = default)
    {
        var maxVersion = await _db.DocumentVersions
            .Where(v => v.DocumentId == documentId)
            .MaxAsync(v => (int?)v.Version, ct);
        return (maxVersion ?? 0) + 1;
    }

    public async Task<Document> CreateAsync(Document document, CancellationToken ct = default)
    {
        _db.Documents.Add(document);
        await _db.SaveChangesAsync(ct);
        return document;
    }

    public async Task<Document> UpdateAsync(Document document, CancellationToken ct = default)
    {
        _db.Documents.Update(document);
        await _db.SaveChangesAsync(ct);
        return document;
    }

    public async Task<DocumentVersion> AddVersionAsync(DocumentVersion version, CancellationToken ct = default)
    {
        _db.DocumentVersions.Add(version);
        await _db.SaveChangesAsync(ct);
        return version;
    }

    public async Task<List<Document>> SearchAsync(Guid orgId, string query, int limit, CancellationToken ct = default)
        => await _db.Documents
            .Where(d => d.OrgId == orgId &&
                (EF.Functions.ILike(d.Title, $"%{query}%")))
            .OrderByDescending(d => d.UpdatedAt)
            .Take(limit)
            .ToListAsync(ct);

    public async Task<List<Document>> ListRecentAsync(Guid orgId, int limit, CancellationToken ct = default)
        => await _db.Documents
            .Where(d => d.OrgId == orgId)
            .OrderByDescending(d => d.UpdatedAt)
            .Take(limit)
            .ToListAsync(ct);
}
