namespace Vyne.ERP.Domain.Settings;

public class OrgSettings
{
    public Guid Id { get; private set; }
    public Guid OrgId { get; private set; }

    // General
    public string CompanyName { get; private set; } = string.Empty;
    public string? CompanyLogo { get; private set; }
    public string? Address { get; private set; }
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public string? Website { get; private set; }
    public string? TaxId { get; private set; }

    // Finance
    public string BaseCurrency { get; private set; } = "USD";
    public string DateFormat { get; private set; } = "MM/DD/YYYY";
    public int FiscalYearStartMonth { get; private set; } = 1;        // January = 1
    public string OrderNumberPrefix { get; private set; } = "ORD";
    public string InvoiceNumberPrefix { get; private set; } = "INV";
    public int NextOrderNumber { get; private set; } = 1000;
    public int NextInvoiceNumber { get; private set; } = 1000;

    // Inventory
    public bool TrackInventory { get; private set; } = true;
    public bool AllowNegativeStock { get; private set; } = false;
    public bool AutoReorder { get; private set; } = true;

    // Tax
    public decimal DefaultTaxRate { get; private set; } = 10m;
    public bool PricesIncludeTax { get; private set; } = false;

    // Payment terms (days)
    public int DefaultPaymentTermsDays { get; private set; } = 30;

    public DateTime UpdatedAt { get; private set; }

    private OrgSettings() { }

    public static OrgSettings CreateDefault(Guid orgId, string companyName)
        => new()
        {
            Id = Guid.NewGuid(),
            OrgId = orgId,
            CompanyName = companyName,
            UpdatedAt = DateTime.UtcNow
        };

    public void Update(
        string? companyName = null,
        string? companyLogo = null,
        string? address = null,
        string? phone = null,
        string? email = null,
        string? website = null,
        string? taxId = null,
        string? baseCurrency = null,
        string? dateFormat = null,
        int? fiscalYearStartMonth = null,
        string? orderNumberPrefix = null,
        string? invoiceNumberPrefix = null,
        bool? trackInventory = null,
        bool? allowNegativeStock = null,
        bool? autoReorder = null,
        decimal? defaultTaxRate = null,
        bool? pricesIncludeTax = null,
        int? defaultPaymentTermsDays = null)
    {
        if (companyName != null) CompanyName = companyName;
        if (companyLogo != null) CompanyLogo = companyLogo;
        if (address != null) Address = address;
        if (phone != null) Phone = phone;
        if (email != null) Email = email;
        if (website != null) Website = website;
        if (taxId != null) TaxId = taxId;
        if (baseCurrency != null) BaseCurrency = baseCurrency;
        if (dateFormat != null) DateFormat = dateFormat;
        if (fiscalYearStartMonth.HasValue) FiscalYearStartMonth = fiscalYearStartMonth.Value;
        if (orderNumberPrefix != null) OrderNumberPrefix = orderNumberPrefix;
        if (invoiceNumberPrefix != null) InvoiceNumberPrefix = invoiceNumberPrefix;
        if (trackInventory.HasValue) TrackInventory = trackInventory.Value;
        if (allowNegativeStock.HasValue) AllowNegativeStock = allowNegativeStock.Value;
        if (autoReorder.HasValue) AutoReorder = autoReorder.Value;
        if (defaultTaxRate.HasValue) DefaultTaxRate = defaultTaxRate.Value;
        if (pricesIncludeTax.HasValue) PricesIncludeTax = pricesIncludeTax.Value;
        if (defaultPaymentTermsDays.HasValue) DefaultPaymentTermsDays = defaultPaymentTermsDays.Value;
        UpdatedAt = DateTime.UtcNow;
    }

    public string GenerateOrderNumber()
        => $"{OrderNumberPrefix}-{NextOrderNumber:D5}";

    public string GenerateInvoiceNumber()
        => $"{InvoiceNumberPrefix}-{NextInvoiceNumber:D5}";

    public void IncrementOrderNumber()
    {
        NextOrderNumber++;
        UpdatedAt = DateTime.UtcNow;
    }

    public void IncrementInvoiceNumber()
    {
        NextInvoiceNumber++;
        UpdatedAt = DateTime.UtcNow;
    }
}
