/**
 * OAuth marketplace registry (21.6).
 *
 * Static catalogue of every third-party VYNE knows how to talk to,
 * keyed by provider id. Each entry carries the metadata the
 * integrations UI needs to render a "Connect" tile + the env-var
 * names production needs to flip to enable the flow.
 *
 * No tokens stored client-side — the client only sees `connected`
 * (resolved server-side from the OAuth state cookie / DB row).
 */

export type OAuthProviderId =
  | "google"
  | "microsoft"
  | "github"
  | "stripe"
  | "shopify"
  | "quickbooks"
  | "slack"
  | "salesforce"
  | "hubspot"
  | "zoom"
  | "linear"
  | "jira"
  | "notion";

export interface OAuthProvider {
  id: OAuthProviderId;
  name: string;
  /** Short pitch shown on the marketplace tile. */
  blurb: string;
  /** Lucide icon name or static URL. */
  icon: string;
  /** OAuth scopes requested. */
  scopes: string[];
  /** Env vars the server needs to complete the flow. */
  envVars: { clientId: string; clientSecret: string };
  /** Where the integration writes data once connected. */
  connectsTo: ("contacts" | "deals" | "tasks" | "invoices" | "calendar" | "drive" | "chat" | "code")[];
  /** Optional documentation URL. */
  docsUrl?: string;
  /** Marketing category for grouping. */
  category: "Productivity" | "Sales" | "Finance" | "DevOps" | "Communication";
}

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  {
    id: "google",
    name: "Google Workspace",
    blurb: "Calendar + Drive + Gmail. Powers meeting AI, doc sync, and contact import.",
    icon: "Google",
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
    ],
    envVars: { clientId: "GOOGLE_CLIENT_ID", clientSecret: "GOOGLE_CLIENT_SECRET" },
    connectsTo: ["contacts", "calendar", "drive"],
    docsUrl: "https://developers.google.com/identity/protocols/oauth2",
    category: "Productivity",
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    blurb: "Outlook calendar + OneDrive + Teams calls. Same surface area as Google.",
    icon: "Microsoft",
    scopes: ["Calendars.ReadWrite", "Files.Read.All", "Mail.ReadWrite"],
    envVars: { clientId: "MICROSOFT_CLIENT_ID", clientSecret: "MICROSOFT_CLIENT_SECRET" },
    connectsTo: ["contacts", "calendar", "drive"],
    category: "Productivity",
  },
  {
    id: "github",
    name: "GitHub",
    blurb: "Pull requests, deploys, and code search inside the workspace.",
    icon: "Github",
    scopes: ["repo", "read:org"],
    envVars: { clientId: "GITHUB_CLIENT_ID", clientSecret: "GITHUB_CLIENT_SECRET" },
    connectsTo: ["code"],
    category: "DevOps",
  },
  {
    id: "stripe",
    name: "Stripe",
    blurb: "Real invoice payment links + subscription billing for VYNE Invoicing.",
    icon: "Stripe",
    scopes: ["read_only", "read_write"],
    envVars: { clientId: "STRIPE_CLIENT_ID", clientSecret: "STRIPE_SECRET_KEY" },
    connectsTo: ["invoices"],
    docsUrl: "https://stripe.com/docs/connect/standard-accounts",
    category: "Finance",
  },
  {
    id: "shopify",
    name: "Shopify",
    blurb: "Two-way sync of orders + products + customers between Shopify and VYNE.",
    icon: "Shopify",
    scopes: ["read_orders", "read_products", "read_customers"],
    envVars: { clientId: "SHOPIFY_CLIENT_ID", clientSecret: "SHOPIFY_CLIENT_SECRET" },
    connectsTo: ["invoices", "contacts"],
    category: "Sales",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    blurb: "Mirror invoices + bills into your accounting ledger.",
    icon: "QuickBooks",
    scopes: ["com.intuit.quickbooks.accounting"],
    envVars: { clientId: "QUICKBOOKS_CLIENT_ID", clientSecret: "QUICKBOOKS_CLIENT_SECRET" },
    connectsTo: ["invoices"],
    category: "Finance",
  },
  {
    id: "slack",
    name: "Slack",
    blurb: "Slash commands, automation deliveries, and channel digests.",
    icon: "Slack",
    scopes: ["commands", "chat:write", "channels:read"],
    envVars: { clientId: "SLACK_CLIENT_ID", clientSecret: "SLACK_CLIENT_SECRET" },
    connectsTo: ["chat"],
    category: "Communication",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    blurb: "One-time migration from Salesforce — leads, opps, accounts, contacts.",
    icon: "Salesforce",
    scopes: ["api", "refresh_token"],
    envVars: { clientId: "SF_CLIENT_ID", clientSecret: "SF_CLIENT_SECRET" },
    connectsTo: ["contacts", "deals"],
    category: "Sales",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    blurb: "Same as Salesforce — drop-in migration with live read-back.",
    icon: "Hubspot",
    scopes: ["crm.objects.contacts.read", "crm.objects.deals.read"],
    envVars: { clientId: "HUBSPOT_CLIENT_ID", clientSecret: "HUBSPOT_CLIENT_SECRET" },
    connectsTo: ["contacts", "deals"],
    category: "Sales",
  },
  {
    id: "zoom",
    name: "Zoom",
    blurb: "Auto-create meeting links from VYNE calendar; recordings flow into docs.",
    icon: "Zoom",
    scopes: ["meeting:write"],
    envVars: { clientId: "ZOOM_CLIENT_ID", clientSecret: "ZOOM_CLIENT_SECRET" },
    connectsTo: ["calendar"],
    category: "Communication",
  },
  {
    id: "linear",
    name: "Linear",
    blurb: "Mirror issues + cycles into VYNE projects. Two-way status sync.",
    icon: "Linear",
    scopes: ["read", "write"],
    envVars: { clientId: "LINEAR_CLIENT_ID", clientSecret: "LINEAR_CLIENT_SECRET" },
    connectsTo: ["tasks"],
    category: "DevOps",
  },
  {
    id: "jira",
    name: "Jira",
    blurb: "Tickets / sprints / boards mirror to VYNE projects.",
    icon: "Jira",
    scopes: ["read:jira-work", "write:jira-work"],
    envVars: { clientId: "JIRA_CLIENT_ID", clientSecret: "JIRA_CLIENT_SECRET" },
    connectsTo: ["tasks"],
    category: "DevOps",
  },
  {
    id: "notion",
    name: "Notion",
    blurb: "Mirror pages into VYNE Docs; keep your knowledge base in one place.",
    icon: "Notion",
    scopes: ["read_content", "update_content"],
    envVars: { clientId: "NOTION_CLIENT_ID", clientSecret: "NOTION_CLIENT_SECRET" },
    connectsTo: ["drive"],
    category: "Productivity",
  },
];

export function listProviders(): OAuthProvider[] {
  return OAUTH_PROVIDERS;
}

export function providerById(id: OAuthProviderId): OAuthProvider | null {
  return OAUTH_PROVIDERS.find((p) => p.id === id) ?? null;
}

/** Server-side helper: a provider is "configured" when both env vars
 *  are present in `process.env`. The marketplace UI uses this to gate
 *  the Connect button. */
export function providerConfigured(id: OAuthProviderId): boolean {
  if (typeof process === "undefined") return false;
  const p = providerById(id);
  if (!p) return false;
  return Boolean(
    process.env[p.envVars.clientId] && process.env[p.envVars.clientSecret],
  );
}
