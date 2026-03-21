namespace Vyne.ERP.Domain.Accounting;

public enum AccountType { Asset, Liability, Equity, Revenue, Expense }

public class ChartOfAccount
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string Code { get; private set; } = string.Empty;  // e.g. "1000"
    public string Name { get; private set; } = string.Empty;  // e.g. "Cash"
    public AccountType Type { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; }

    private ChartOfAccount() { }

    public static ChartOfAccount Create(Guid orgId, string code, string name, AccountType type)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Account code is required.", nameof(code));
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Account name is required.", nameof(name));

        return new()
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            Code = code.Trim(),
            Name = name.Trim(),
            Type = type,
            CreatedAt = DateTime.UtcNow,
        };
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}

public class JournalEntry
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }
    public string EntryNumber { get; private set; } = string.Empty;
    public DateTime EntryDate { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public string? Reference { get; private set; }  // invoice/order number
    public bool IsPosted { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public ICollection<JournalLine> Lines { get; private set; } = [];

    private JournalEntry() { }

    public static JournalEntry Create(
        Guid orgId,
        string number,
        DateTime date,
        string description,
        string? reference = null)
    {
        if (string.IsNullOrWhiteSpace(number))
            throw new ArgumentException("Entry number is required.", nameof(number));
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Description is required.", nameof(description));

        return new()
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            EntryNumber = number.Trim(),
            EntryDate = date,
            Description = description.Trim(),
            Reference = reference,
            CreatedAt = DateTime.UtcNow,
        };
    }

    public void AddLine(Guid accountId, decimal debit, decimal credit, string? memo = null)
    {
        if (IsPosted)
            throw new InvalidOperationException("Cannot modify a posted journal entry.");
        if (debit < 0 || credit < 0)
            throw new ArgumentException("Debit and credit amounts cannot be negative.");
        if (debit == 0 && credit == 0)
            throw new ArgumentException("A journal line must have a non-zero debit or credit.");

        Lines.Add(JournalLine.Create(Id, accountId, debit, credit, memo));
    }

    public void Post()
    {
        if (IsPosted)
            throw new InvalidOperationException("Journal entry is already posted.");
        if (!IsBalanced)
            throw new InvalidOperationException(
                $"Cannot post an unbalanced journal entry. Debits={TotalDebits}, Credits={TotalCredits}.");
        if (!Lines.Any())
            throw new InvalidOperationException("Cannot post a journal entry with no lines.");

        IsPosted = true;
    }

    public decimal TotalDebits => Lines.Sum(l => l.Debit);
    public decimal TotalCredits => Lines.Sum(l => l.Credit);
    public bool IsBalanced => TotalDebits == TotalCredits;
}

public class JournalLine
{
    public Guid Id { get; private set; }
    public Guid JournalEntryId { get; private set; }
    public Guid AccountId { get; private set; }
    public decimal Debit { get; private set; }
    public decimal Credit { get; private set; }
    public string? Memo { get; private set; }

    private JournalLine() { }

    public static JournalLine Create(
        Guid journalEntryId,
        Guid accountId,
        decimal debit,
        decimal credit,
        string? memo = null)
        => new()
        {
            Id = Guid.NewGuid(),
            JournalEntryId = journalEntryId,
            AccountId = accountId,
            Debit = debit,
            Credit = credit,
            Memo = memo,
        };
}
