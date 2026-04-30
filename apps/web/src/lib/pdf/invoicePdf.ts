/**
 * Client-side PDF invoice generation via the browser print pipeline.
 * Keeps the bundle lean — no jsPDF dep, no html2canvas.
 *
 * Usage:
 *   import { downloadInvoicePdf } from "@/lib/pdf/invoicePdf";
 *   downloadInvoicePdf(invoice, organisation);
 */

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoicePayload {
  number: string;
  issueDate: string;
  dueDate: string;
  status?: "draft" | "sent" | "paid" | "overdue";
  customer: {
    name: string;
    email?: string;
    address?: string;
  };
  lineItems: InvoiceLineItem[];
  taxRate?: number;
  notes?: string;
  currency?: string;
}

export interface InvoiceOrg {
  name: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  accentColor?: string;
}

function money(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(n);
}

function renderInvoiceHtml(invoice: InvoicePayload, org: InvoiceOrg): string {
  const accent = org.accentColor ?? "var(--vyne-accent, #06B6D4)";
  const currency = invoice.currency ?? "USD";
  const subtotal = invoice.lineItems.reduce(
    (s, li) => s + li.quantity * li.unitPrice,
    0,
  );
  const tax = invoice.taxRate ? subtotal * invoice.taxRate : 0;
  const total = subtotal + tax;

  const statusBadge = invoice.status
    ? `<span class="status status-${invoice.status}">${invoice.status.toUpperCase()}</span>`
    : "";

  const rows = invoice.lineItems
    .map(
      (li) => `
    <tr>
      <td>${escapeHtml(li.description)}</td>
      <td class="num">${li.quantity}</td>
      <td class="num">${money(li.unitPrice, currency)}</td>
      <td class="num">${money(li.quantity * li.unitPrice, currency)}</td>
    </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(invoice.number)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 32px 40px;
    color: #1A1A2E;
    background: #fff;
    font-size: 13px;
    line-height: 1.55;
  }
  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 2px solid ${accent};
    padding-bottom: 18px;
    margin-bottom: 22px;
  }
  .brand {
    display: flex; align-items: center; gap: 12px;
  }
  .logo {
    width: 42px; height: 42px; border-radius: 10px;
    background: linear-gradient(135deg, ${accent}, ${accent}cc);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 800; font-size: 18px;
  }
  h1 { margin: 0; font-size: 20px; letter-spacing: -0.01em; }
  h2 { font-size: 11px; color: #6B6B8A; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 6px; font-weight: 600; }
  .invoice-meta { text-align: right; }
  .invoice-number { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; color: #6B6B8A; }
  .invoice-title { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 26px; }
  .box { padding: 14px 16px; border: 1px solid #E8E8F0; border-radius: 10px; }
  .box p { margin: 2px 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 13px;
  }
  thead th {
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6B6B8A;
    padding: 10px 12px;
    background: #F7F7FB;
    border-bottom: 1px solid #E8E8F0;
  }
  tbody td {
    padding: 12px;
    border-bottom: 1px solid #F0F0F8;
  }
  tbody td.num, thead th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals {
    width: 320px;
    margin-left: auto;
    font-size: 13px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
  }
  .totals-row.grand {
    border-top: 2px solid ${accent};
    margin-top: 6px;
    padding-top: 12px;
    font-weight: 700;
    font-size: 17px;
    color: ${accent};
  }
  .status {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .status-paid { background: #DCFCE7; color: #166534; }
  .status-sent { background: #DBEAFE; color: #1D4ED8; }
  .status-draft { background: #F3F4F6; color: #6B6B8A; }
  .status-overdue { background: #FEE2E2; color: #991B1B; }
  .notes {
    margin-top: 28px;
    padding: 14px 16px;
    background: #F7F7FB;
    border-radius: 10px;
    font-size: 12px;
    color: #3A3A5A;
    line-height: 1.6;
  }
  footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #E8E8F0;
    font-size: 11px;
    color: #A0A0B8;
    text-align: center;
  }
  @media print {
    body { padding: 20mm; }
    header { page-break-after: avoid; }
  }
</style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo">${escapeHtml(org.name.charAt(0).toUpperCase())}</div>
      <div>
        <h1>${escapeHtml(org.name)}</h1>
        <div style="font-size:11px;color:#6B6B8A;">${escapeHtml(org.email ?? "")}</div>
        <div style="font-size:11px;color:#6B6B8A;">${escapeHtml(org.address ?? "")}</div>
      </div>
    </div>
    <div class="invoice-meta">
      <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;">
        <p class="invoice-title">Invoice</p>
        ${statusBadge}
      </div>
      <p class="invoice-number">${escapeHtml(invoice.number)}</p>
    </div>
  </header>

  <section class="grid">
    <div class="box">
      <h2>Billed to</h2>
      <p><strong>${escapeHtml(invoice.customer.name)}</strong></p>
      ${invoice.customer.email ? `<p>${escapeHtml(invoice.customer.email)}</p>` : ""}
      ${invoice.customer.address ? `<p>${escapeHtml(invoice.customer.address)}</p>` : ""}
    </div>
    <div class="box" style="text-align:right;">
      <h2>Dates</h2>
      <p><strong>Issued:</strong> ${escapeHtml(invoice.issueDate)}</p>
      <p><strong>Due:</strong> ${escapeHtml(invoice.dueDate)}</p>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Unit price</th>
        <th class="num">Line total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${money(subtotal, currency)}</span></div>
    ${
      invoice.taxRate
        ? `<div class="totals-row"><span>Tax (${(invoice.taxRate * 100).toFixed(1)}%)</span><span>${money(tax, currency)}</span></div>`
        : ""
    }
    <div class="totals-row grand"><span>Total due</span><span>${money(total, currency)}</span></div>
  </div>

  ${
    invoice.notes
      ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</div>`
      : ""
  }

  <footer>
    Generated by VYNE · ${escapeHtml(org.name)} · Thank you for your business.
  </footer>

  <script>
    setTimeout(function() {
      window.print();
      window.addEventListener('afterprint', function() {
        window.close();
      });
    }, 200);
  </script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Opens a new window, renders the invoice HTML, and triggers the browser's
 * print dialog so the user can save as PDF.
 */
export function downloadInvoicePdf(
  invoice: InvoicePayload,
  org: InvoiceOrg,
): void {
  const html = renderInvoiceHtml(invoice, org);
  const win = globalThis.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    // Popup blocked — fall back to blob URL download.
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.number}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
