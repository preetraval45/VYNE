/**
 * Per-module CSV import templates + migration importer presets.
 *
 *   - templateFor("contacts") → CSV header + 2 example rows
 *   - presetFor("contacts", "salesforce") → field-mapping
 *
 * Used by `<ImportCSVModal />` to seed the column-mapping step when
 * the user picks "I'm migrating from <X>" + by `<EmptyState />` to
 * offer a "Download template" link on every empty list view.
 */

export type ModuleKey =
  | "contacts"
  | "deals"
  | "tasks"
  | "projects"
  | "invoices"
  | "products"
  | "expenses";

export interface ImportTemplate {
  /** Filename used when the user clicks Download. */
  filename: string;
  /** Header row + 2 illustrative example rows. */
  csv: string;
  /** Canonical column ids the importer expects. */
  columns: Array<{ key: string; label: string; required?: boolean }>;
}

/**
 * Field-mapping presets for major upstream CRMs / ERPs.
 *
 *   When the user picks "Migrate from Salesforce" the importer
 *   pre-populates the column-mapping step with these values, so the
 *   typical workflow is "drag CSV → confirm 80 % auto-mapped → done".
 *
 * Each preset is keyed by `{module}-{source}`; values map *source CSV
 * column names* → *VYNE column ids*.
 */
export interface MigrationPreset {
  source: string;
  /** Where the user can find the export instructions. */
  instructionsUrl?: string;
  /** Column-name → VYNE-id map. Both sides are case-insensitive. */
  mapping: Record<string, string>;
}

const TEMPLATES: Record<ModuleKey, ImportTemplate> = {
  contacts: {
    filename: "vyne-contacts-template.csv",
    csv: [
      "name,email,phone,company,title",
      "Sarah Kim,sarah@acmecorp.com,+1 415 555 0118,Acme Corp,VP Engineering",
      "Tony Marquez,tony@acmecorp.com,+1 415 555 0102,Acme Corp,Procurement Lead",
    ].join("\n"),
    columns: [
      { key: "name", label: "Full name", required: true },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "company", label: "Company" },
      { key: "title", label: "Title" },
    ],
  },
  deals: {
    filename: "vyne-deals-template.csv",
    csv: [
      "company,contact,value,stage,probability,closeDate",
      "Acme Corp,Sarah Kim,42000,Negotiation,60,2026-06-15",
      "Beta Industries,Maya Okonkwo,18500,Discovery,25,2026-07-30",
    ].join("\n"),
    columns: [
      { key: "company", label: "Company", required: true },
      { key: "contact", label: "Primary contact" },
      { key: "value", label: "Deal value (USD)", required: true },
      { key: "stage", label: "Stage" },
      { key: "probability", label: "Probability %" },
      { key: "closeDate", label: "Expected close date" },
    ],
  },
  tasks: {
    filename: "vyne-tasks-template.csv",
    csv: [
      "title,project,assignee,status,priority,dueDate",
      "Wire Stripe webhook,Billing v2,Sarah Kim,In Progress,P1,2026-05-20",
      "Draft Q3 launch email,Marketing,Tony Marquez,Todo,P2,2026-06-01",
    ].join("\n"),
    columns: [
      { key: "title", label: "Task title", required: true },
      { key: "project", label: "Project" },
      { key: "assignee", label: "Assignee" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "dueDate", label: "Due date" },
    ],
  },
  projects: {
    filename: "vyne-projects-template.csv",
    csv: [
      "name,owner,status,startDate,endDate",
      "Billing v2,Sarah Kim,On track,2026-04-01,2026-09-30",
      "Q3 launch,Tony Marquez,At risk,2026-05-15,2026-08-30",
    ].join("\n"),
    columns: [
      { key: "name", label: "Project name", required: true },
      { key: "owner", label: "Owner" },
      { key: "status", label: "Status" },
      { key: "startDate", label: "Start date" },
      { key: "endDate", label: "End date" },
    ],
  },
  invoices: {
    filename: "vyne-invoices-template.csv",
    csv: [
      "number,customer,amount,currency,issuedAt,dueDate,status",
      "INV-2026-0042,Acme Corp,12400,USD,2026-04-01,2026-05-01,Sent",
      "INV-2026-0043,Beta Industries,8900,USD,2026-04-08,2026-05-08,Draft",
    ].join("\n"),
    columns: [
      { key: "number", label: "Invoice #", required: true },
      { key: "customer", label: "Customer", required: true },
      { key: "amount", label: "Amount", required: true },
      { key: "currency", label: "Currency" },
      { key: "issuedAt", label: "Issued at" },
      { key: "dueDate", label: "Due date" },
      { key: "status", label: "Status" },
    ],
  },
  products: {
    filename: "vyne-products-template.csv",
    csv: [
      "sku,name,price,stock,category",
      "PWR-003,12V Power Adapter,29.99,124,Power",
      "CBL-A12,USB-C 1m Cable,9.99,508,Cables",
    ].join("\n"),
    columns: [
      { key: "sku", label: "SKU", required: true },
      { key: "name", label: "Name", required: true },
      { key: "price", label: "Price" },
      { key: "stock", label: "Stock" },
      { key: "category", label: "Category" },
    ],
  },
  expenses: {
    filename: "vyne-expenses-template.csv",
    csv: [
      "vendor,amount,category,description,incurredAt",
      "Vercel,240,Cloud,Pro plan,2026-04-12",
      "Notion,16,SaaS,Personal seat,2026-04-15",
    ].join("\n"),
    columns: [
      { key: "vendor", label: "Vendor", required: true },
      { key: "amount", label: "Amount", required: true },
      { key: "category", label: "Category" },
      { key: "description", label: "Description" },
      { key: "incurredAt", label: "Incurred at" },
    ],
  },
};

/** Return the template (header + sample rows) for a module. */
export function templateFor(module: ModuleKey): ImportTemplate {
  return TEMPLATES[module];
}

/**
 * Browser-side download helper. Streams a CSV blob to the user's
 * downloads folder under the canonical template filename.
 */
export function downloadTemplate(module: ModuleKey): void {
  if (typeof window === "undefined") return;
  const tpl = TEMPLATES[module];
  const blob = new Blob([tpl.csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tpl.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const PRESETS: Record<string, MigrationPreset> = {
  // ── CRM contacts ────────────────────────────────────────────────
  "contacts-salesforce": {
    source: "Salesforce",
    instructionsUrl:
      "https://help.salesforce.com/s/articleView?id=sf.exporting_data.htm",
    mapping: {
      "Full Name": "name",
      Name: "name",
      Email: "email",
      Phone: "phone",
      "Account Name": "company",
      Title: "title",
    },
  },
  "contacts-hubspot": {
    source: "HubSpot",
    instructionsUrl:
      "https://knowledge.hubspot.com/import-and-export/export-records",
    mapping: {
      "First Name": "name",
      "Last Name": "name",
      Email: "email",
      "Phone Number": "phone",
      Company: "company",
      "Job Title": "title",
    },
  },
  "contacts-pipedrive": {
    source: "Pipedrive",
    instructionsUrl: "https://support.pipedrive.com/en/article/exporting-data",
    mapping: {
      Name: "name",
      Email: "email",
      Phone: "phone",
      "Organization name": "company",
      "Job title": "title",
    },
  },
  "contacts-odoo": {
    source: "Odoo",
    mapping: {
      Name: "name",
      "Email": "email",
      Phone: "phone",
      Company: "company",
      "Job Position": "title",
    },
  },

  // ── CRM deals ───────────────────────────────────────────────────
  "deals-salesforce": {
    source: "Salesforce",
    instructionsUrl:
      "https://help.salesforce.com/s/articleView?id=sf.exporting_data.htm",
    mapping: {
      "Account Name": "company",
      "Opportunity Owner": "contact",
      Amount: "value",
      Stage: "stage",
      Probability: "probability",
      "Close Date": "closeDate",
    },
  },
  "deals-hubspot": {
    source: "HubSpot",
    mapping: {
      "Deal Name": "company",
      "Deal Owner": "contact",
      Amount: "value",
      "Deal Stage": "stage",
      Probability: "probability",
      "Close Date": "closeDate",
    },
  },
  "deals-pipedrive": {
    source: "Pipedrive",
    mapping: {
      Title: "company",
      Owner: "contact",
      Value: "value",
      Stage: "stage",
      Probability: "probability",
      "Expected close date": "closeDate",
    },
  },
  "deals-odoo": {
    source: "Odoo",
    mapping: {
      "Opportunity": "company",
      "Salesperson": "contact",
      "Expected Revenue": "value",
      Stage: "stage",
      Probability: "probability",
      "Expected Closing": "closeDate",
    },
  },

  // ── Invoices ───────────────────────────────────────────────────
  "invoices-quickbooks": {
    source: "QuickBooks",
    mapping: {
      "Invoice No": "number",
      Customer: "customer",
      Amount: "amount",
      "Issue Date": "issuedAt",
      "Due Date": "dueDate",
      Status: "status",
    },
  },
  "invoices-xero": {
    source: "Xero",
    mapping: {
      "Invoice Number": "number",
      "Contact Name": "customer",
      Total: "amount",
      Currency: "currency",
      "Invoice Date": "issuedAt",
      "Due Date": "dueDate",
      Status: "status",
    },
  },
  "invoices-stripe": {
    source: "Stripe",
    mapping: {
      "Invoice ID": "number",
      "Customer Name": "customer",
      "Amount Due": "amount",
      Currency: "currency",
      "Created (UTC)": "issuedAt",
      "Due Date (UTC)": "dueDate",
      Status: "status",
    },
  },
};

/** Lookup a preset by `{module}-{source}` slug. */
export function presetFor(slug: string): MigrationPreset | null {
  return PRESETS[slug] ?? null;
}

/** All presets for a given module — used for the source picker. */
export function presetsForModule(module: ModuleKey): Array<{
  slug: string;
  preset: MigrationPreset;
}> {
  const prefix = `${module}-`;
  return Object.entries(PRESETS)
    .filter(([k]) => k.startsWith(prefix))
    .map(([slug, preset]) => ({ slug, preset }));
}
