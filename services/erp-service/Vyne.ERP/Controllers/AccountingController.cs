using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Vyne.ERP.Domain.Accounting;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Controllers;

[ApiController]
[Authorize]
[Route("accounting")]
public class AccountingController : ControllerBase
{
    private readonly ERPDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly ILogger<AccountingController> _logger;

    public AccountingController(ERPDbContext db, ITenantContext tenant, ILogger<AccountingController> logger)
    {
        _db = db;
        _tenant = tenant;
        _logger = logger;
    }

    // ── GET /accounting/accounts ──────────────────────────────────────────────

    [HttpGet("accounts")]
    public async Task<IActionResult> ListAccounts(
        [FromQuery] AccountType? type,
        [FromQuery] bool? active,
        [FromQuery] string? search,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var query = _db.ChartOfAccounts.AsNoTracking();

        if (type.HasValue)
            query = query.Where(a => a.Type == type.Value);
        if (active.HasValue)
            query = query.Where(a => a.IsActive == active.Value);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(a =>
                a.Code.ToLower().Contains(search.ToLower()) ||
                a.Name.ToLower().Contains(search.ToLower()));

        var items = await query
            .OrderBy(a => a.Code)
            .ToListAsync(ct);

        return Ok(new { total = items.Count, items });
    }

    // ── POST /accounting/accounts ─────────────────────────────────────────────

    [HttpPost("accounts")]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountRequest body, CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.Code))
            return BadRequest(Error("VALIDATION_ERROR", "Account code is required."));
        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(Error("VALIDATION_ERROR", "Account name is required."));

        // Check code uniqueness within org
        var exists = await _db.ChartOfAccounts.AnyAsync(a => a.Code == body.Code.Trim(), ct);
        if (exists)
            return Conflict(Error("ACCOUNT_CODE_CONFLICT",
                $"An account with code '{body.Code}' already exists."));

        ChartOfAccount account;
        try
        {
            account = ChartOfAccount.Create(orgId, body.Code, body.Name, body.Type);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }

        _db.ChartOfAccounts.Add(account);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Account created: {AccountId} Code={Code} OrgId={OrgId}",
            account.Id, account.Code, orgId);

        return StatusCode(201, account);
    }

    // ── GET /accounting/journal ───────────────────────────────────────────────

    [HttpGet("journal")]
    public async Task<IActionResult> ListJournalEntries(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] bool? isPosted,
        [FromQuery] string? reference,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 200) pageSize = 50;

        var query = _db.JournalEntries.AsNoTracking();

        if (from.HasValue)
            query = query.Where(j => j.EntryDate >= from.Value);
        if (to.HasValue)
            query = query.Where(j => j.EntryDate <= to.Value);
        if (isPosted.HasValue)
            query = query.Where(j => j.IsPosted == isPosted.Value);
        if (!string.IsNullOrWhiteSpace(reference))
            query = query.Where(j => j.Reference != null && j.Reference.Contains(reference));

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(j => j.EntryDate)
            .ThenByDescending(j => j.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(j => new
            {
                j.Id,
                j.OrgId,
                j.EntryNumber,
                j.EntryDate,
                j.Description,
                j.Reference,
                j.IsPosted,
                j.CreatedAt,
                j.TotalDebits,
                j.TotalCredits,
                j.IsBalanced,
                LineCount = j.Lines.Count,
            })
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    // ── POST /accounting/journal ──────────────────────────────────────────────

    [HttpPost("journal")]
    public async Task<IActionResult> CreateJournalEntry(
        [FromBody] CreateJournalEntryRequest body,
        CancellationToken ct)
    {
        if (_tenant.OrgId is not { } orgId)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        if (string.IsNullOrWhiteSpace(body.EntryNumber))
            return BadRequest(Error("VALIDATION_ERROR", "Entry number is required."));
        if (string.IsNullOrWhiteSpace(body.Description))
            return BadRequest(Error("VALIDATION_ERROR", "Description is required."));
        if (body.Lines is null || body.Lines.Count == 0)
            return BadRequest(Error("VALIDATION_ERROR", "At least one journal line is required."));

        // Check entry number uniqueness
        var exists = await _db.JournalEntries.AnyAsync(j => j.EntryNumber == body.EntryNumber.Trim(), ct);
        if (exists)
            return Conflict(Error("ENTRY_NUMBER_CONFLICT",
                $"Journal entry number '{body.EntryNumber}' already exists."));

        JournalEntry entry;
        try
        {
            entry = JournalEntry.Create(orgId, body.EntryNumber, body.EntryDate, body.Description, body.Reference);

            foreach (var line in body.Lines)
            {
                // Validate account exists
                var accountExists = await _db.ChartOfAccounts.AnyAsync(a => a.Id == line.AccountId, ct);
                if (!accountExists)
                    return UnprocessableEntity(Error("ACCOUNT_NOT_FOUND",
                        $"Account '{line.AccountId}' not found."));

                entry.AddLine(line.AccountId, line.Debit, line.Credit, line.Memo);
            }
        }
        catch (ArgumentException ex)
        {
            return BadRequest(Error("VALIDATION_ERROR", ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("JOURNAL_ERROR", ex.Message));
        }

        _db.JournalEntries.Add(entry);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Journal entry created: {EntryId} #{Number} OrgId={OrgId}",
            entry.Id, entry.EntryNumber, orgId);

        return StatusCode(201, await GetEntryWithLines(entry.Id, ct));
    }

    // ── PATCH /accounting/journal/{id}/post ───────────────────────────────────

    [HttpPatch("journal/{id:guid}/post")]
    public async Task<IActionResult> PostJournalEntry(Guid id, CancellationToken ct)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var entry = await _db.JournalEntries
            .Include(j => j.Lines)
            .FirstOrDefaultAsync(j => j.Id == id, ct);

        if (entry is null)
            return NotFound(Error("NOT_FOUND", $"Journal entry '{id}' not found."));

        try
        {
            entry.Post();
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(Error("JOURNAL_ERROR", ex.Message));
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Journal entry posted: {EntryId} #{Number}", id, entry.EntryNumber);

        return Ok(await GetEntryWithLines(id, ct));
    }

    // ── GET /accounting/trial-balance ─────────────────────────────────────────

    [HttpGet("trial-balance")]
    public async Task<IActionResult> GetTrialBalance(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] bool postedOnly = true,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var now = DateTime.UtcNow;
        var periodFrom = from ?? new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var periodTo = to ?? now;

        var lineQuery = _db.JournalLines
            .AsNoTracking()
            .Where(l =>
                _db.JournalEntries.Any(j =>
                    j.Id == l.JournalEntryId &&
                    j.EntryDate >= periodFrom &&
                    j.EntryDate <= periodTo &&
                    (!postedOnly || j.IsPosted)));

        var accounts = await _db.ChartOfAccounts.AsNoTracking()
            .Where(a => a.IsActive)
            .OrderBy(a => a.Code)
            .ToListAsync(ct);

        var lines = await lineQuery
            .GroupBy(l => l.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                TotalDebit = g.Sum(l => l.Debit),
                TotalCredit = g.Sum(l => l.Credit),
            })
            .ToListAsync(ct);

        var rows = accounts.Select(a =>
        {
            var l = lines.FirstOrDefault(x => x.AccountId == a.Id);
            var debit = l?.TotalDebit ?? 0m;
            var credit = l?.TotalCredit ?? 0m;
            return new
            {
                a.Id,
                a.Code,
                a.Name,
                a.Type,
                TotalDebit = debit,
                TotalCredit = credit,
                NetBalance = debit - credit,
            };
        }).Where(r => r.TotalDebit != 0 || r.TotalCredit != 0).ToList();

        return Ok(new
        {
            Period = new { From = periodFrom, To = periodTo },
            PostedOnly = postedOnly,
            Rows = rows,
            Totals = new
            {
                TotalDebits = rows.Sum(r => r.TotalDebit),
                TotalCredits = rows.Sum(r => r.TotalCredit),
            },
            GeneratedAt = now,
        });
    }

    // ── GET /accounting/pl ────────────────────────────────────────────────────

    [HttpGet("pl")]
    public async Task<IActionResult> GetProfitAndLoss(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] bool postedOnly = true,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var now = DateTime.UtcNow;
        var periodFrom = from ?? new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var periodTo = to ?? now;

        // Fetch posted lines within date range for Revenue and Expense accounts
        var lines = await _db.JournalLines
            .AsNoTracking()
            .Where(l =>
                _db.JournalEntries.Any(j =>
                    j.Id == l.JournalEntryId &&
                    j.EntryDate >= periodFrom &&
                    j.EntryDate <= periodTo &&
                    (!postedOnly || j.IsPosted)) &&
                _db.ChartOfAccounts.Any(a =>
                    a.Id == l.AccountId &&
                    (a.Type == AccountType.Revenue || a.Type == AccountType.Expense)))
            .Select(l => new
            {
                l.AccountId,
                l.Debit,
                l.Credit,
                AccountType = _db.ChartOfAccounts
                    .Where(a => a.Id == l.AccountId)
                    .Select(a => a.Type)
                    .FirstOrDefault(),
                AccountCode = _db.ChartOfAccounts
                    .Where(a => a.Id == l.AccountId)
                    .Select(a => a.Code)
                    .FirstOrDefault(),
                AccountName = _db.ChartOfAccounts
                    .Where(a => a.Id == l.AccountId)
                    .Select(a => a.Name)
                    .FirstOrDefault(),
            })
            .ToListAsync(ct);

        // Revenue: credits increase revenue accounts, debits decrease
        var revenueLines = lines
            .Where(l => l.AccountType == AccountType.Revenue)
            .GroupBy(l => new { l.AccountId, l.AccountCode, l.AccountName })
            .Select(g => new
            {
                g.Key.AccountId,
                g.Key.AccountCode,
                g.Key.AccountName,
                Amount = g.Sum(l => l.Credit) - g.Sum(l => l.Debit),
            })
            .OrderBy(r => r.AccountCode)
            .ToList();

        // Expense: debits increase expense accounts, credits decrease
        var expenseLines = lines
            .Where(l => l.AccountType == AccountType.Expense)
            .GroupBy(l => new { l.AccountId, l.AccountCode, l.AccountName })
            .Select(g => new
            {
                g.Key.AccountId,
                g.Key.AccountCode,
                g.Key.AccountName,
                Amount = g.Sum(l => l.Debit) - g.Sum(l => l.Credit),
            })
            .OrderBy(r => r.AccountCode)
            .ToList();

        var totalRevenue = revenueLines.Sum(r => r.Amount);
        var totalExpenses = expenseLines.Sum(e => e.Amount);
        var netIncome = totalRevenue - totalExpenses;

        return Ok(new
        {
            Period = new { From = periodFrom, To = periodTo },
            PostedOnly = postedOnly,
            Revenue = new { Total = totalRevenue, Lines = revenueLines },
            Expenses = new { Total = totalExpenses, Lines = expenseLines },
            NetIncome = netIncome,
            GeneratedAt = now,
        });
    }

    // ── GET /accounting/balance-sheet ─────────────────────────────────────────

    [HttpGet("balance-sheet")]
    public async Task<IActionResult> GetBalanceSheet(
        [FromQuery] DateTime? asOf,
        [FromQuery] bool postedOnly = true,
        CancellationToken ct = default)
    {
        if (_tenant.OrgId is null)
            return Unauthorized(Error("UNAUTHORIZED", "Tenant context not available."));

        var now = DateTime.UtcNow;
        var asOfDate = asOf ?? now;

        // All posted lines up to asOf date
        var lines = await _db.JournalLines
            .AsNoTracking()
            .Where(l =>
                _db.JournalEntries.Any(j =>
                    j.Id == l.JournalEntryId &&
                    j.EntryDate <= asOfDate &&
                    (!postedOnly || j.IsPosted)) &&
                _db.ChartOfAccounts.Any(a =>
                    a.Id == l.AccountId &&
                    (a.Type == AccountType.Asset ||
                     a.Type == AccountType.Liability ||
                     a.Type == AccountType.Equity)))
            .Select(l => new
            {
                l.AccountId,
                l.Debit,
                l.Credit,
                AccountType = _db.ChartOfAccounts
                    .Where(a => a.Id == l.AccountId)
                    .Select(a => a.Type)
                    .FirstOrDefault(),
                AccountCode = _db.ChartOfAccounts
                    .Where(a => a.Id == l.AccountId)
                    .Select(a => a.Code)
                    .FirstOrDefault(),
                AccountName = _db.ChartOfAccounts
                    .Where(a => a.Id == l.AccountId)
                    .Select(a => a.Name)
                    .FirstOrDefault(),
            })
            .ToListAsync(ct);

        static decimal AccountBalance(AccountType type, decimal debit, decimal credit)
            => type == AccountType.Asset ? debit - credit : credit - debit;

        var grouped = lines
            .GroupBy(l => new { l.AccountId, l.AccountCode, l.AccountName, l.AccountType })
            .Select(g => new
            {
                g.Key.AccountId,
                g.Key.AccountCode,
                g.Key.AccountName,
                g.Key.AccountType,
                Balance = AccountBalance(g.Key.AccountType, g.Sum(l => l.Debit), g.Sum(l => l.Credit)),
            })
            .OrderBy(r => r.AccountCode)
            .ToList();

        var assets = grouped.Where(r => r.AccountType == AccountType.Asset).ToList();
        var liabilities = grouped.Where(r => r.AccountType == AccountType.Liability).ToList();
        var equity = grouped.Where(r => r.AccountType == AccountType.Equity).ToList();

        var totalAssets = assets.Sum(a => a.Balance);
        var totalLiabilities = liabilities.Sum(l => l.Balance);
        var totalEquity = equity.Sum(e => e.Balance);

        return Ok(new
        {
            AsOf = asOfDate,
            PostedOnly = postedOnly,
            Assets = new { Total = totalAssets, Lines = assets },
            Liabilities = new { Total = totalLiabilities, Lines = liabilities },
            Equity = new { Total = totalEquity, Lines = equity },
            LiabilitiesAndEquity = totalLiabilities + totalEquity,
            IsBalanced = totalAssets == totalLiabilities + totalEquity,
            GeneratedAt = now,
        });
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<object?> GetEntryWithLines(Guid id, CancellationToken ct)
    {
        return await _db.JournalEntries
            .AsNoTracking()
            .Where(j => j.Id == id)
            .Select(j => new
            {
                j.Id,
                j.OrgId,
                j.EntryNumber,
                j.EntryDate,
                j.Description,
                j.Reference,
                j.IsPosted,
                j.TotalDebits,
                j.TotalCredits,
                j.IsBalanced,
                j.CreatedAt,
                Lines = j.Lines.Select(l => new
                {
                    l.Id,
                    l.AccountId,
                    AccountCode = _db.ChartOfAccounts
                        .Where(a => a.Id == l.AccountId)
                        .Select(a => a.Code)
                        .FirstOrDefault(),
                    AccountName = _db.ChartOfAccounts
                        .Where(a => a.Id == l.AccountId)
                        .Select(a => a.Name)
                        .FirstOrDefault(),
                    l.Debit,
                    l.Credit,
                    l.Memo,
                }).ToList(),
            })
            .FirstOrDefaultAsync(ct);
    }

    private static object Error(string code, string message) =>
        new { error = new { code, message } };
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record CreateAccountRequest(
    string Code,
    string Name,
    AccountType Type);

public record CreateJournalEntryRequest(
    string EntryNumber,
    DateTime EntryDate,
    string Description,
    string? Reference,
    List<JournalLineRequest> Lines);

public record JournalLineRequest(
    Guid AccountId,
    decimal Debit,
    decimal Credit,
    string? Memo);
