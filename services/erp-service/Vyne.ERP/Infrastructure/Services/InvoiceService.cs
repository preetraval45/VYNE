using Microsoft.EntityFrameworkCore;
using System.Text;
using Vyne.ERP.Domain.Settings;
using Vyne.ERP.Infrastructure.Data;

namespace Vyne.ERP.Infrastructure.Services;

public interface IInvoiceService
{
    Task<byte[]> GenerateInvoicePdfAsync(Guid orderId, CancellationToken ct = default);
    Task<string> GetInvoiceHtmlAsync(Guid orderId, CancellationToken ct = default);
}

public class InvoiceService : IInvoiceService
{
    private readonly ERPDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<InvoiceService> _logger;

    public InvoiceService(ERPDbContext db, IWebHostEnvironment env, ILogger<InvoiceService> logger)
    {
        _db = db;
        _env = env;
        _logger = logger;
    }

    public async Task<byte[]> GenerateInvoicePdfAsync(Guid orderId, CancellationToken ct = default)
    {
        var html = await GetInvoiceHtmlAsync(orderId, ct);

        // In production: wire up QuestPDF or PuppeteerSharp here.
        // For now return UTF-8 bytes of the HTML (browsers render it directly).
        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<string> GetInvoiceHtmlAsync(Guid orderId, CancellationToken ct = default)
    {
        // ── Fetch order ────────────────────────────────────────────────────────
        var order = await _db.Orders
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct)
            ?? throw new KeyNotFoundException($"Order '{orderId}' not found.");

        // ── Fetch org settings ─────────────────────────────────────────────────
        var settings = await _db.OrgSettings
            .AsNoTracking()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.OrgId == order.OrgId, ct)
            ?? OrgSettings.CreateDefault(order.OrgId, "My Company");

        // ── Fetch customer name if available ───────────────────────────────────
        string? customerName = null;
        string? customerEmail = null;
        if (order.CustomerId.HasValue)
        {
            var customer = await _db.Customers
                .AsNoTracking()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.Id == order.CustomerId.Value, ct);
            customerName = customer?.Name;
            customerEmail = customer?.Email;
        }

        // ── Generate invoice number ────────────────────────────────────────────
        var invoiceNumber = settings.GenerateInvoiceNumber();

        // ── Build HTML ─────────────────────────────────────────────────────────
        var html = BuildInvoiceHtml(order, settings, invoiceNumber, customerName, customerEmail);

        _logger.LogInformation(
            "Invoice HTML generated for order {OrderId} ({OrderNumber}), invoice {InvoiceNumber}",
            orderId, order.OrderNumber, invoiceNumber);

        return html;
    }

    private static string BuildInvoiceHtml(
        Domain.Orders.Order order,
        OrgSettings settings,
        string invoiceNumber,
        string? customerName,
        string? customerEmail)
    {
        var sb = new StringBuilder();

        sb.AppendLine("<!DOCTYPE html>");
        sb.AppendLine("<html lang=\"en\">");
        sb.AppendLine("<head>");
        sb.AppendLine("  <meta charset=\"UTF-8\" />");
        sb.AppendLine("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />");
        sb.AppendLine($"  <title>Invoice {invoiceNumber}</title>");
        sb.AppendLine("  <style>");
        sb.AppendLine(InvoiceCss());
        sb.AppendLine("  </style>");
        sb.AppendLine("</head>");
        sb.AppendLine("<body>");
        sb.AppendLine("  <div class=\"invoice-wrapper\">");

        // ── Header ─────────────────────────────────────────────────────────────
        sb.AppendLine("    <header class=\"invoice-header\">");
        sb.AppendLine("      <div class=\"company-info\">");
        if (!string.IsNullOrEmpty(settings.CompanyLogo))
            sb.AppendLine($"        <img src=\"{Esc(settings.CompanyLogo)}\" alt=\"{Esc(settings.CompanyName)}\" class=\"logo\" />");
        sb.AppendLine($"        <h1>{Esc(settings.CompanyName)}</h1>");
        if (!string.IsNullOrEmpty(settings.Address))
            sb.AppendLine($"        <p>{Esc(settings.Address)}</p>");
        if (!string.IsNullOrEmpty(settings.Phone))
            sb.AppendLine($"        <p>Phone: {Esc(settings.Phone)}</p>");
        if (!string.IsNullOrEmpty(settings.Email))
            sb.AppendLine($"        <p>Email: {Esc(settings.Email)}</p>");
        if (!string.IsNullOrEmpty(settings.Website))
            sb.AppendLine($"        <p>Web: {Esc(settings.Website)}</p>");
        if (!string.IsNullOrEmpty(settings.TaxId))
            sb.AppendLine($"        <p>Tax ID: {Esc(settings.TaxId)}</p>");
        sb.AppendLine("      </div>");

        sb.AppendLine("      <div class=\"invoice-meta\">");
        sb.AppendLine("        <h2>INVOICE</h2>");
        sb.AppendLine($"        <table class=\"meta-table\">");
        sb.AppendLine($"          <tr><th>Invoice #</th><td>{Esc(invoiceNumber)}</td></tr>");
        sb.AppendLine($"          <tr><th>Order #</th><td>{Esc(order.OrderNumber)}</td></tr>");
        sb.AppendLine($"          <tr><th>Date</th><td>{order.CreatedAt:yyyy-MM-dd}</td></tr>");
        sb.AppendLine($"          <tr><th>Due Date</th><td>{order.CreatedAt.AddDays(settings.DefaultPaymentTermsDays):yyyy-MM-dd}</td></tr>");
        sb.AppendLine($"          <tr><th>Payment Terms</th><td>Net {settings.DefaultPaymentTermsDays} days</td></tr>");
        sb.AppendLine($"          <tr><th>Currency</th><td>{Esc(settings.BaseCurrency)}</td></tr>");
        sb.AppendLine("        </table>");
        sb.AppendLine("      </div>");
        sb.AppendLine("    </header>");

        // ── Bill To ─────────────────────────────────────────────────────────────
        sb.AppendLine("    <section class=\"bill-to\">");
        sb.AppendLine("      <h3>Bill To</h3>");
        if (!string.IsNullOrEmpty(customerName))
            sb.AppendLine($"      <p class=\"customer-name\">{Esc(customerName)}</p>");
        else
            sb.AppendLine("      <p class=\"customer-name\">—</p>");
        if (!string.IsNullOrEmpty(customerEmail))
            sb.AppendLine($"      <p>{Esc(customerEmail)}</p>");
        sb.AppendLine("    </section>");

        // ── Line Items ──────────────────────────────────────────────────────────
        sb.AppendLine("    <section class=\"line-items\">");
        sb.AppendLine("      <table class=\"items-table\">");
        sb.AppendLine("        <thead>");
        sb.AppendLine("          <tr>");
        sb.AppendLine("            <th class=\"col-desc\">Description</th>");
        sb.AppendLine("            <th class=\"col-sku\">SKU</th>");
        sb.AppendLine("            <th class=\"col-qty\">Qty</th>");
        sb.AppendLine("            <th class=\"col-price\">Unit Price</th>");
        sb.AppendLine("            <th class=\"col-total\">Total</th>");
        sb.AppendLine("          </tr>");
        sb.AppendLine("        </thead>");
        sb.AppendLine("        <tbody>");

        foreach (var line in order.Lines)
        {
            sb.AppendLine("          <tr>");
            sb.AppendLine($"            <td>{Esc(line.ProductName)}</td>");
            sb.AppendLine($"            <td>{Esc(line.ProductSku ?? "—")}</td>");
            sb.AppendLine($"            <td class=\"text-right\">{line.Quantity:N0}</td>");
            sb.AppendLine($"            <td class=\"text-right\">{settings.BaseCurrency} {line.UnitPrice:N2}</td>");
            sb.AppendLine($"            <td class=\"text-right\">{settings.BaseCurrency} {line.LineTotal:N2}</td>");
            sb.AppendLine("          </tr>");
        }

        sb.AppendLine("        </tbody>");
        sb.AppendLine("      </table>");
        sb.AppendLine("    </section>");

        // ── Totals ──────────────────────────────────────────────────────────────
        var taxRate = settings.DefaultTaxRate;
        var taxLabel = settings.PricesIncludeTax
            ? $"Tax ({taxRate:N1}% incl.)"
            : $"Tax ({taxRate:N1}%)";

        sb.AppendLine("    <section class=\"totals\">");
        sb.AppendLine("      <table class=\"totals-table\">");
        sb.AppendLine($"        <tr><th>Subtotal</th><td>{settings.BaseCurrency} {order.Subtotal:N2}</td></tr>");
        sb.AppendLine($"        <tr><th>{taxLabel}</th><td>{settings.BaseCurrency} {order.TaxAmount:N2}</td></tr>");
        sb.AppendLine($"        <tr class=\"total-row\"><th>Total</th><td>{settings.BaseCurrency} {order.TotalAmount:N2}</td></tr>");
        sb.AppendLine("      </table>");
        sb.AppendLine("    </section>");

        // ── Notes ───────────────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(order.Notes))
        {
            sb.AppendLine("    <section class=\"notes\">");
            sb.AppendLine("      <h4>Notes</h4>");
            sb.AppendLine($"      <p>{Esc(order.Notes)}</p>");
            sb.AppendLine("    </section>");
        }

        // ── Footer ──────────────────────────────────────────────────────────────
        sb.AppendLine("    <footer class=\"invoice-footer\">");
        sb.AppendLine($"      <p>Thank you for your business, {Esc(customerName ?? "valued customer")}!</p>");
        if (!string.IsNullOrEmpty(settings.Website))
            sb.AppendLine($"      <p>{Esc(settings.Website)}</p>");
        sb.AppendLine($"      <p class=\"generated-by\">Generated by {Esc(settings.CompanyName)} ERP</p>");
        sb.AppendLine("    </footer>");

        sb.AppendLine("  </div>");
        sb.AppendLine("</body>");
        sb.AppendLine("</html>");

        return sb.ToString();
    }

    private static string Esc(string? s)
        => s is null
            ? string.Empty
            : s.Replace("&", "&amp;")
               .Replace("<", "&lt;")
               .Replace(">", "&gt;")
               .Replace("\"", "&quot;");

    private static string InvoiceCss() => """
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #2d2d2d; background: #f5f5f5; }
        .invoice-wrapper { max-width: 860px; margin: 30px auto; background: #fff; padding: 40px 48px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }

        /* Header */
        .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; border-bottom: 2px solid #1a56db; padding-bottom: 24px; }
        .company-info h1 { font-size: 20px; font-weight: 700; color: #1a56db; margin-bottom: 6px; }
        .company-info p { color: #555; line-height: 1.6; }
        .logo { max-height: 60px; margin-bottom: 10px; }
        .invoice-meta h2 { font-size: 28px; font-weight: 800; color: #1a56db; text-align: right; margin-bottom: 12px; letter-spacing: 2px; }
        .meta-table { text-align: right; border-collapse: collapse; }
        .meta-table th { font-weight: 600; color: #777; padding: 2px 8px 2px 0; white-space: nowrap; }
        .meta-table td { color: #2d2d2d; font-weight: 500; padding: 2px 0; }

        /* Bill To */
        .bill-to { margin-bottom: 28px; }
        .bill-to h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 6px; }
        .bill-to .customer-name { font-size: 15px; font-weight: 700; }

        /* Items */
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .items-table thead tr { background: #1a56db; color: #fff; }
        .items-table th { padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .items-table td { padding: 9px 12px; border-bottom: 1px solid #e8e8e8; vertical-align: middle; }
        .items-table tbody tr:hover { background: #f8f9ff; }
        .col-desc { width: 40%; }
        .col-sku { width: 15%; }
        .col-qty, .col-price, .col-total { width: 15%; }
        .text-right { text-align: right; }

        /* Totals */
        .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
        .totals-table { border-collapse: collapse; min-width: 280px; }
        .totals-table th { text-align: left; padding: 6px 16px 6px 8px; color: #666; font-weight: 500; }
        .totals-table td { text-align: right; padding: 6px 0; font-weight: 500; }
        .totals-table tr.total-row th, .totals-table tr.total-row td { font-size: 16px; font-weight: 800; color: #1a56db; border-top: 2px solid #1a56db; padding-top: 10px; }

        /* Notes */
        .notes { background: #f9fafb; border-left: 3px solid #1a56db; padding: 14px 18px; margin-bottom: 28px; border-radius: 0 4px 4px 0; }
        .notes h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 6px; }

        /* Footer */
        .invoice-footer { text-align: center; border-top: 1px solid #e8e8e8; padding-top: 20px; color: #888; font-size: 12px; line-height: 1.8; }
        .generated-by { font-size: 10px; color: #bbb; margin-top: 8px; }
        """;
}
