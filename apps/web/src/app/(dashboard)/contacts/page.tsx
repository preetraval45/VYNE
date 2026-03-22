"use client";

import { useState, useRef, useCallback } from "react";
import { Plus, Search, Upload, X, ChevronDown } from "lucide-react";
import { ExportButton } from "@/components/shared/ExportButton";
import { ImportCSVModal } from "@/components/shared/ImportCSVModal";

// ─── Types ───────────────────────────────────────────────────────
type ContactsTab = "accounts" | "contacts" | "import";

type AccountStatus = "Active" | "Prospect" | "Inactive";
type ContactTag =
  | "VIP"
  | "Decision Maker"
  | "Technical"
  | "Billing"
  | "Primary";

interface Account {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  revenue: number;
  employees: number;
  owner: string;
  status: AccountStatus;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  accountId: string;
  title: string;
  department: string;
  lastContact: string;
  tags: ContactTag[];
}

// ─── Mock Data ───────────────────────────────────────────────────
const NOW = Date.now();
const daysAgo = (d: number) =>
  new Date(NOW - d * 86400000).toISOString().slice(0, 10);

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Retail",
  "Energy",
  "Education",
  "Real Estate",
];

const MOCK_ACCOUNTS: Account[] = [
  {
    id: "acc1",
    name: "Acme Corp",
    industry: "Technology",
    website: "acme.com",
    phone: "+1 (555) 100-2000",
    revenue: 12500000,
    employees: 340,
    owner: "Alex Rivera",
    status: "Active",
  },
  {
    id: "acc2",
    name: "MediHealth Systems",
    industry: "Healthcare",
    website: "medihealth.io",
    phone: "+1 (555) 200-3000",
    revenue: 8400000,
    employees: 520,
    owner: "Priya Shah",
    status: "Active",
  },
  {
    id: "acc3",
    name: "FinEdge Capital",
    industry: "Finance",
    website: "finedge.com",
    phone: "+1 (555) 300-4000",
    revenue: 45000000,
    employees: 1200,
    owner: "Sam Chen",
    status: "Prospect",
  },
  {
    id: "acc4",
    name: "BuildWorks Inc",
    industry: "Manufacturing",
    website: "buildworks.co",
    phone: "+1 (555) 400-5000",
    revenue: 6800000,
    employees: 190,
    owner: "Alex Rivera",
    status: "Active",
  },
  {
    id: "acc5",
    name: "RetailNow",
    industry: "Retail",
    website: "retailnow.com",
    phone: "+1 (555) 500-6000",
    revenue: 3200000,
    employees: 85,
    owner: "Jordan Lee",
    status: "Inactive",
  },
  {
    id: "acc6",
    name: "GreenVolt Energy",
    industry: "Energy",
    website: "greenvolt.io",
    phone: "+1 (555) 600-7000",
    revenue: 18700000,
    employees: 430,
    owner: "Priya Shah",
    status: "Active",
  },
  {
    id: "acc7",
    name: "EduSpark",
    industry: "Education",
    website: "eduspark.org",
    phone: "+1 (555) 700-8000",
    revenue: 2100000,
    employees: 65,
    owner: "Sam Chen",
    status: "Prospect",
  },
  {
    id: "acc8",
    name: "UrbanPrime Realty",
    industry: "Real Estate",
    website: "urbanprime.com",
    phone: "+1 (555) 800-9000",
    revenue: 28500000,
    employees: 310,
    owner: "Jordan Lee",
    status: "Active",
  },
  {
    id: "acc9",
    name: "CloudOps Solutions",
    industry: "Technology",
    website: "cloudops.dev",
    phone: "+1 (555) 900-1000",
    revenue: 9600000,
    employees: 210,
    owner: "Alex Rivera",
    status: "Active",
  },
  {
    id: "acc10",
    name: "PharmaLink",
    industry: "Healthcare",
    website: "pharmalink.com",
    phone: "+1 (555) 110-2200",
    revenue: 35000000,
    employees: 890,
    owner: "Priya Shah",
    status: "Prospect",
  },
];

const MOCK_CONTACTS: Contact[] = [
  {
    id: "c1",
    name: "Sarah Johnson",
    email: "sarah@acme.com",
    phone: "+1 (555) 101-0001",
    company: "Acme Corp",
    accountId: "acc1",
    title: "VP of Engineering",
    department: "Engineering",
    lastContact: daysAgo(2),
    tags: ["Decision Maker", "VIP"],
  },
  {
    id: "c2",
    name: "Marcus Chen",
    email: "marcus@acme.com",
    phone: "+1 (555) 101-0002",
    company: "Acme Corp",
    accountId: "acc1",
    title: "CTO",
    department: "Engineering",
    lastContact: daysAgo(5),
    tags: ["Decision Maker"],
  },
  {
    id: "c3",
    name: "Emily Watson",
    email: "emily@medihealth.io",
    phone: "+1 (555) 201-0001",
    company: "MediHealth Systems",
    accountId: "acc2",
    title: "Procurement Manager",
    department: "Operations",
    lastContact: daysAgo(1),
    tags: ["Billing", "Primary"],
  },
  {
    id: "c4",
    name: "David Park",
    email: "david@medihealth.io",
    phone: "+1 (555) 201-0002",
    company: "MediHealth Systems",
    accountId: "acc2",
    title: "IT Director",
    department: "IT",
    lastContact: daysAgo(8),
    tags: ["Technical"],
  },
  {
    id: "c5",
    name: "Rachel Adams",
    email: "rachel@finedge.com",
    phone: "+1 (555) 301-0001",
    company: "FinEdge Capital",
    accountId: "acc3",
    title: "CFO",
    department: "Finance",
    lastContact: daysAgo(3),
    tags: ["Decision Maker", "VIP"],
  },
  {
    id: "c6",
    name: "Tom Bradley",
    email: "tom@finedge.com",
    phone: "+1 (555) 301-0002",
    company: "FinEdge Capital",
    accountId: "acc3",
    title: "Senior Analyst",
    department: "Finance",
    lastContact: daysAgo(12),
    tags: ["Technical"],
  },
  {
    id: "c7",
    name: "Ana Rodriguez",
    email: "ana@buildworks.co",
    phone: "+1 (555) 401-0001",
    company: "BuildWorks Inc",
    accountId: "acc4",
    title: "Operations Head",
    department: "Operations",
    lastContact: daysAgo(6),
    tags: ["Decision Maker", "Primary"],
  },
  {
    id: "c8",
    name: "Kevin Zhao",
    email: "kevin@retailnow.com",
    phone: "+1 (555) 501-0001",
    company: "RetailNow",
    accountId: "acc5",
    title: "Store Director",
    department: "Sales",
    lastContact: daysAgo(30),
    tags: ["Primary"],
  },
  {
    id: "c9",
    name: "Lisa Patel",
    email: "lisa@greenvolt.io",
    phone: "+1 (555) 601-0001",
    company: "GreenVolt Energy",
    accountId: "acc6",
    title: "VP of Sales",
    department: "Sales",
    lastContact: daysAgo(4),
    tags: ["VIP", "Decision Maker"],
  },
  {
    id: "c10",
    name: "James Wright",
    email: "james@greenvolt.io",
    phone: "+1 (555) 601-0002",
    company: "GreenVolt Energy",
    accountId: "acc6",
    title: "Engineer",
    department: "Engineering",
    lastContact: daysAgo(15),
    tags: ["Technical"],
  },
  {
    id: "c11",
    name: "Sophie Kim",
    email: "sophie@eduspark.org",
    phone: "+1 (555) 701-0001",
    company: "EduSpark",
    accountId: "acc7",
    title: "Director of Programs",
    department: "Education",
    lastContact: daysAgo(7),
    tags: ["Decision Maker"],
  },
  {
    id: "c12",
    name: "Nathan Brooks",
    email: "nathan@urbanprime.com",
    phone: "+1 (555) 801-0001",
    company: "UrbanPrime Realty",
    accountId: "acc8",
    title: "Managing Partner",
    department: "Executive",
    lastContact: daysAgo(2),
    tags: ["VIP", "Decision Maker"],
  },
  {
    id: "c13",
    name: "Mia Foster",
    email: "mia@urbanprime.com",
    phone: "+1 (555) 801-0002",
    company: "UrbanPrime Realty",
    accountId: "acc8",
    title: "Legal Counsel",
    department: "Legal",
    lastContact: daysAgo(9),
    tags: ["Billing"],
  },
  {
    id: "c14",
    name: "Derek Ng",
    email: "derek@cloudops.dev",
    phone: "+1 (555) 901-0001",
    company: "CloudOps Solutions",
    accountId: "acc9",
    title: "Lead Architect",
    department: "Engineering",
    lastContact: daysAgo(1),
    tags: ["Technical", "Primary"],
  },
  {
    id: "c15",
    name: "Olivia Martinez",
    email: "olivia@pharmalink.com",
    phone: "+1 (555) 111-0001",
    company: "PharmaLink",
    accountId: "acc10",
    title: "Head of Procurement",
    department: "Operations",
    lastContact: daysAgo(11),
    tags: ["Decision Maker", "Billing"],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────
function fmtRevenue(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function accountStatusConfig(s: AccountStatus): { bg: string; color: string } {
  const map: Record<AccountStatus, { bg: string; color: string }> = {
    Active: { bg: "#F0FDF4", color: "#166534" },
    Prospect: { bg: "#EFF6FF", color: "#1E40AF" },
    Inactive: { bg: "#F4F4F8", color: "#6B6B8A" },
  };
  return map[s];
}

function tagConfig(tag: ContactTag): { bg: string; color: string } {
  const map: Record<ContactTag, { bg: string; color: string }> = {
    VIP: { bg: "#FEF3C7", color: "#92400E" },
    "Decision Maker": { bg: "#F5F3FF", color: "#5B21B6" },
    Technical: { bg: "#EFF6FF", color: "#1E40AF" },
    Billing: { bg: "#FEF2F2", color: "#991B1B" },
    Primary: { bg: "#F0FDF4", color: "#166534" },
  };
  return map[tag];
}

function daysSinceStr(isoDate: string): string {
  const d = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

// ─── Shared UI ───────────────────────────────────────────────────
function TabBtn({
  label,
  active,
  onClick,
  count,
}: Readonly<{
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}>) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        background: "transparent",
        color: active ? "var(--vyne-purple)" : "var(--text-secondary)",
        borderBottom: active
          ? "2px solid var(--vyne-purple)"
          : "2px solid transparent",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 10,
            background: active ? "rgba(108,71,255,0.12)" : "#F0F0F8",
            color: active ? "var(--vyne-purple)" : "var(--text-tertiary)",
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function StatusBadge({
  status,
  config,
}: Readonly<{ status: string; config: { bg: string; color: string } }>) {
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: config.bg,
        color: config.color,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}

function TagPill({ tag }: Readonly<{ tag: ContactTag }>) {
  const cfg = tagConfig(tag);
  return (
    <span
      style={{
        padding: "1px 7px",
        borderRadius: 12,
        fontSize: 10,
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      {tag}
    </span>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: Readonly<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        borderRadius: 8,
        border: "1px solid var(--content-border)",
        background: "var(--content-secondary)",
        width: 240,
      }}
    >
      <Search
        size={14}
        style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          fontSize: 12,
          color: "var(--text-primary)",
          outline: "none",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            color: "var(--text-tertiary)",
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}>) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "7px 28px 7px 12px",
          borderRadius: 8,
          border: "1px solid var(--content-border)",
          background: "var(--content-secondary)",
          fontSize: 12,
          color: value ? "var(--text-primary)" : "var(--text-tertiary)",
          cursor: "pointer",
          outline: "none",
          appearance: "none",
          WebkitAppearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A0A0B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
        }}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function NewButton({
  label,
  onClick,
}: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 8,
        border: "none",
        background: "linear-gradient(135deg, #6C47FF 0%, #8B6BFF 100%)",
        color: "#fff",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(108,71,255,0.3)",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 14px rgba(108,71,255,0.45)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 8px rgba(108,71,255,0.3)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

// Table header cell
function Th({
  children,
  width,
}: Readonly<{ children: React.ReactNode; width?: number | string }>) {
  return (
    <th
      style={{
        padding: "10px 14px",
        textAlign: "left",
        fontSize: 10,
        fontWeight: 600,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
        width: width ?? "auto",
        borderBottom: "1px solid var(--content-border)",
      }}
    >
      {children}
    </th>
  );
}

// Table data cell
function Td({
  children,
  mono,
}: Readonly<{ children: React.ReactNode; mono?: boolean }>) {
  return (
    <td
      style={{
        padding: "10px 14px",
        fontSize: 12,
        color: "var(--text-primary)",
        whiteSpace: "nowrap",
        fontFamily: mono ? "'SF Mono', 'Fira Code', monospace" : "inherit",
        borderBottom: "1px solid var(--content-border)",
      }}
    >
      {children}
    </td>
  );
}

// ─── Accounts Tab ────────────────────────────────────────────────
function AccountsTab() {
  const [accounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = accounts.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.owner.toLowerCase().includes(search.toLowerCase());
    const matchIndustry = !industryFilter || a.industry === industryFilter;
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchIndustry && matchStatus;
  });

  const exportData = filtered.map((a) => ({
    name: a.name,
    industry: a.industry,
    website: a.website,
    phone: a.phone,
    revenue: String(a.revenue),
    employees: String(a.employees),
    owner: a.owner,
    status: a.status,
  }));

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search accounts..."
          />
          <FilterDropdown
            label="All Industries"
            value={industryFilter}
            options={INDUSTRIES}
            onChange={setIndustryFilter}
          />
          <FilterDropdown
            label="All Statuses"
            value={statusFilter}
            options={["Active", "Prospect", "Inactive"]}
            onChange={setStatusFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="accounts-export"
            columns={[
              { key: "name", header: "Name" },
              { key: "industry", header: "Industry" },
              { key: "website", header: "Website" },
              { key: "phone", header: "Phone" },
              { key: "revenue", header: "Revenue" },
              { key: "employees", header: "Employees" },
              { key: "owner", header: "Owner" },
              { key: "status", header: "Status" },
            ]}
          />
          <NewButton label="New Account" onClick={() => {}} />
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[
          {
            label: "Total Accounts",
            value: String(accounts.length),
            color: "var(--vyne-purple)",
          },
          {
            label: "Active",
            value: String(accounts.filter((a) => a.status === "Active").length),
            color: "#166534",
          },
          {
            label: "Prospects",
            value: String(
              accounts.filter((a) => a.status === "Prospect").length,
            ),
            color: "#1E40AF",
          },
          {
            label: "Total Revenue",
            value: fmtRevenue(accounts.reduce((s, a) => s + a.revenue, 0)),
            color: "var(--vyne-purple)",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              flex: 1,
              padding: "14px 16px",
              borderRadius: 10,
              background: "var(--content-bg)",
              border: "1px solid var(--content-border)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              {kpi.label}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: kpi.color,
                letterSpacing: "-0.03em",
              }}
            >
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          borderRadius: 10,
          border: "1px solid var(--content-border)",
          overflow: "hidden",
          background: "var(--content-bg)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--content-secondary)" }}>
                <Th>Name</Th>
                <Th>Industry</Th>
                <Th>Website</Th>
                <Th>Phone</Th>
                <Th>Revenue</Th>
                <Th>Employees</Th>
                <Th>Owner</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No accounts match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((account) => {
                  const sc = accountStatusConfig(account.status);
                  return (
                    <tr
                      key={account.id}
                      style={{
                        transition: "background 0.1s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--content-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <Td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: "rgba(108,71,255,0.08)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--vyne-purple)",
                              flexShrink: 0,
                            }}
                          >
                            {account.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>
                            {account.name}
                          </span>
                        </div>
                      </Td>
                      <Td>{account.industry}</Td>
                      <Td>
                        <span
                          style={{ color: "var(--vyne-purple)", fontSize: 12 }}
                        >
                          {account.website}
                        </span>
                      </Td>
                      <Td>{account.phone}</Td>
                      <Td mono>{fmtRevenue(account.revenue)}</Td>
                      <Td>{account.employees.toLocaleString()}</Td>
                      <Td>{account.owner}</Td>
                      <Td>
                        <StatusBadge status={account.status} config={sc} />
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Contacts Tab ────────────────────────────────────────────────
function ContactsTab() {
  const [contacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const companies = [...new Set(contacts.map((c) => c.company))].sort();
  const departments = [...new Set(contacts.map((c) => c.department))].sort();

  const filtered = contacts.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase());
    const matchCompany = !companyFilter || c.company === companyFilter;
    const matchDept = !departmentFilter || c.department === departmentFilter;
    return matchSearch && matchCompany && matchDept;
  });

  const exportData = filtered.map((c) => ({
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    title: c.title,
    department: c.department,
    lastContact: c.lastContact,
    tags: c.tags.join(", "),
  }));

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search contacts..."
          />
          <FilterDropdown
            label="All Companies"
            value={companyFilter}
            options={companies}
            onChange={setCompanyFilter}
          />
          <FilterDropdown
            label="All Departments"
            value={departmentFilter}
            options={departments}
            onChange={setDepartmentFilter}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExportButton
            data={exportData}
            filename="contacts-export"
            columns={[
              { key: "name", header: "Name" },
              { key: "email", header: "Email" },
              { key: "phone", header: "Phone" },
              { key: "company", header: "Company" },
              { key: "title", header: "Title" },
              { key: "department", header: "Department" },
              { key: "lastContact", header: "Last Contact" },
              { key: "tags", header: "Tags" },
            ]}
          />
          <NewButton label="New Contact" onClick={() => {}} />
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          borderRadius: 10,
          border: "1px solid var(--content-border)",
          overflow: "hidden",
          background: "var(--content-bg)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--content-secondary)" }}>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Company</Th>
                <Th>Title</Th>
                <Th>Department</Th>
                <Th>Last Contact</Th>
                <Th>Tags</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      fontSize: 13,
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No contacts match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((contact) => (
                  <tr
                    key={contact.id}
                    style={{ transition: "background 0.1s", cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--content-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    <Td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: "rgba(108,71,255,0.10)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--vyne-purple)",
                            flexShrink: 0,
                          }}
                        >
                          {contact.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 12 }}>
                          {contact.name}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <span
                        style={{ color: "var(--vyne-purple)", fontSize: 12 }}
                      >
                        {contact.email}
                      </span>
                    </Td>
                    <Td>{contact.phone}</Td>
                    <Td>{contact.company}</Td>
                    <Td>{contact.title}</Td>
                    <Td>{contact.department}</Td>
                    <Td>
                      <span
                        style={{ color: "var(--text-secondary)", fontSize: 11 }}
                      >
                        {daysSinceStr(contact.lastContact)}
                      </span>
                    </Td>
                    <Td>
                      <div
                        style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                      >
                        {contact.tags.map((tag) => (
                          <TagPill key={tag} tag={tag} />
                        ))}
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Import Tab ──────────────────────────────────────────────────
function ImportTab() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<"accounts" | "contacts">(
    "contacts",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const accountColumns = [
    { key: "name", label: "Company Name", required: true },
    { key: "industry", label: "Industry" },
    { key: "website", label: "Website" },
    { key: "phone", label: "Phone" },
    { key: "revenue", label: "Revenue" },
    { key: "employees", label: "Employees" },
    { key: "owner", label: "Owner" },
    { key: "status", label: "Status" },
  ];

  const contactColumns = [
    { key: "name", label: "Full Name", required: true },
    { key: "email", label: "Email", required: true },
    { key: "phone", label: "Phone" },
    { key: "company", label: "Company", required: true },
    { key: "title", label: "Title" },
    { key: "department", label: "Department" },
    { key: "tags", label: "Tags" },
  ];

  function handleImportClick(type: "accounts" | "contacts") {
    setImportType(type);
    setShowImportModal(true);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        {/* Accounts Import Card */}
        <div
          style={{
            flex: 1,
            borderRadius: 12,
            border: "1px solid var(--content-border)",
            padding: 24,
            background: "var(--content-bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(108,71,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 21h18M3 7V5a2 2 0 012-2h14a2 2 0 012 2v2M3 7h18M3 7v7m18-7v7M3 14h18M3 14v5h18v-5"
                  stroke="var(--vyne-purple)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Import Accounts
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Upload CSV or Excel file with company data
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 16,
              lineHeight: "1.5",
            }}
          >
            Import company accounts with fields like Name, Industry, Website,
            Phone, Revenue, Employees, Owner, and Status.
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {accountColumns.map((col) => (
              <span
                key={col.key}
                style={{
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 500,
                  background: col.required
                    ? "rgba(108,71,255,0.08)"
                    : "#F4F4F8",
                  color: col.required
                    ? "var(--vyne-purple)"
                    : "var(--text-tertiary)",
                  border: col.required
                    ? "1px solid rgba(108,71,255,0.2)"
                    : "1px solid transparent",
                }}
              >
                {col.label}
                {col.required ? " *" : ""}
              </span>
            ))}
          </div>

          <button
            onClick={() => handleImportClick("accounts")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--vyne-purple)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--content-border)";
            }}
          >
            <Upload size={14} />
            Upload Accounts CSV
          </button>
        </div>

        {/* Contacts Import Card */}
        <div
          style={{
            flex: 1,
            borderRadius: 12,
            border: "1px solid var(--content-border)",
            padding: 24,
            background: "var(--content-bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(108,71,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                  stroke="var(--vyne-purple)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                Import Contacts
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Upload CSV or Excel file with contact data
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 16,
              lineHeight: "1.5",
            }}
          >
            Import people contacts with fields like Name, Email, Phone, Company,
            Title, Department, and Tags.
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 16,
            }}
          >
            {contactColumns.map((col) => (
              <span
                key={col.key}
                style={{
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 500,
                  background: col.required
                    ? "rgba(108,71,255,0.08)"
                    : "#F4F4F8",
                  color: col.required
                    ? "var(--vyne-purple)"
                    : "var(--text-tertiary)",
                  border: col.required
                    ? "1px solid rgba(108,71,255,0.2)"
                    : "1px solid transparent",
                }}
              >
                {col.label}
                {col.required ? " *" : ""}
              </span>
            ))}
          </div>

          <button
            onClick={() => handleImportClick("contacts")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--content-border)",
              background: "var(--content-secondary)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--vyne-purple)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor =
                "var(--content-border)";
            }}
          >
            <Upload size={14} />
            Upload Contacts CSV
          </button>
        </div>
      </div>

      {/* Drag-and-Drop Zone */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--content-border)",
          padding: 24,
          background: "var(--content-bg)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Quick Upload
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) {
              setSelectedFile(file);
              setShowImportModal(true);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--vyne-purple)" : "var(--content-border)"}`,
            borderRadius: 10,
            padding: "48px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver
              ? "rgba(108,71,255,0.04)"
              : "var(--content-secondary)",
            transition: "all 0.15s",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            style={{ margin: "0 auto 14px", display: "block" }}
          >
            <rect width="40" height="40" rx="10" fill="rgba(108,71,255,0.08)" />
            <path
              d="M13 27v2a1 1 0 001 1h12a1 1 0 001-1v-2M20 12v12M16 16l4-4 4 4"
              stroke={dragOver ? "var(--vyne-purple)" : "var(--text-tertiary)"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Drag & drop your CSV or Excel file here
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-tertiary)",
              marginBottom: 8,
            }}
          >
            or click to browse files
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
            Supported formats: .csv, .xlsx, .xls
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFile(file);
                setShowImportModal(true);
              }
            }}
            style={{ display: "none" }}
          />
        </div>

        {/* Column Mapping Info */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 10,
            }}
          >
            Column Mapping
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: "1.6",
            }}
          >
            After uploading your file, you will be guided through a column
            mapping step where you can match your CSV headers to the expected
            fields. Required fields are marked with an asterisk (*). The system
            will auto-detect matching columns when possible.
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 14,
            }}
          >
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Accounts Fields
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: "1.8",
                }}
              >
                Name*, Industry, Website, Phone, Revenue, Employees, Owner,
                Status
              </div>
            </div>
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                background: "var(--content-secondary)",
                border: "1px solid var(--content-border)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}
              >
                Contacts Fields
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: "1.8",
                }}
              >
                Name*, Email*, Phone, Company*, Title, Department, Tags
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <ImportCSVModal
        open={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setSelectedFile(null);
        }}
        moduleName={importType === "accounts" ? "Accounts" : "Contacts"}
        expectedColumns={
          importType === "accounts" ? accountColumns : contactColumns
        }
        onImport={(rows) => {
          setShowImportModal(false);
          setSelectedFile(null);
        }}
      />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function ContactsPage() {
  const [activeTab, setActiveTab] = useState<ContactsTab>("accounts");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              padding: 6,
              borderRadius: 8,
              background: "rgba(108,71,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"
                stroke="var(--vyne-purple)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="9"
                cy="7"
                r="4"
                stroke="var(--vyne-purple)"
                strokeWidth="1.5"
              />
              <path
                d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                stroke="var(--vyne-purple)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Accounts & Contacts
            </h1>
            <p
              style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0 }}
            >
              {MOCK_ACCOUNTS.length} accounts, {MOCK_CONTACTS.length} contacts
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          padding: "0 24px",
          borderBottom: "1px solid var(--content-border)",
          background: "var(--content-bg)",
          flexShrink: 0,
        }}
      >
        <TabBtn
          label="Accounts"
          active={activeTab === "accounts"}
          onClick={() => setActiveTab("accounts")}
          count={MOCK_ACCOUNTS.length}
        />
        <TabBtn
          label="Contacts"
          active={activeTab === "contacts"}
          onClick={() => setActiveTab("contacts")}
          count={MOCK_CONTACTS.length}
        />
        <TabBtn
          label="Import"
          active={activeTab === "import"}
          onClick={() => setActiveTab("import")}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {activeTab === "accounts" && <AccountsTab />}
        {activeTab === "contacts" && <ContactsTab />}
        {activeTab === "import" && <ImportTab />}
      </div>
    </div>
  );
}
