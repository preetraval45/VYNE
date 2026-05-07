import { create } from "zustand";
import { persist } from "zustand/middleware";
import { subscribe as rtSubscribe, isRealtimeEnabled } from "@/lib/realtime";
import { shouldSeedFixtures } from "@/lib/stores/seedMode";

// ─── Types ───────────────────────────────────────────────────────
export type AccountStatus = "Active" | "Prospect" | "Inactive";
export type ContactTag =
  | "VIP"
  | "Decision Maker"
  | "Technical"
  | "Billing"
  | "Primary";

export interface Account {
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

export interface Contact {
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

const DEFAULT_ACCOUNTS: Account[] = [
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

const DEFAULT_CONTACTS: Contact[] = [
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

// ─── Store ───────────────────────────────────────────────────────
interface ContactsStore {
  accounts: Account[];
  contacts: Contact[];
  contactsHydrated: boolean;
  accountsHydrated: boolean;

  // Account CRUD (mirrors to /api/accounts)
  addAccount: (account: Omit<Account, "id">) => void;
  updateAccount: (id: string, data: Partial<Omit<Account, "id">>) => void;
  deleteAccount: (id: string) => void;
  hydrateAccountsFromServer: () => Promise<void>;

  // Contact CRUD (mirrors to /api/contacts)
  addContact: (contact: Omit<Contact, "id">) => void;
  updateContact: (id: string, data: Partial<Omit<Contact, "id">>) => void;
  deleteContact: (id: string) => void;
  hydrateContactsFromServer: () => Promise<void>;

  // Tag operations
  addTag: (contactId: string, tag: ContactTag) => void;
  removeTag: (contactId: string, tag: ContactTag) => void;

  // Bulk import
  importAccounts: (rows: Record<string, string>[]) => void;
  importContacts: (rows: Record<string, string>[]) => void;
}

let _nextId = 100;
function genId(prefix: string) {
  return `${prefix}${++_nextId}`;
}

// Fire-and-forget remote mirror. Failures leave the optimistic local
// state in place; a subsequent hydrate reconciles.
function mirrorCreate(c: Contact) {
  void fetch("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(c),
  }).catch(() => {});
}
function mirrorUpdate(id: string, patch: Partial<Contact>) {
  void fetch(`/api/contacts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
}
function mirrorDelete(id: string) {
  void fetch(`/api/contacts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}
function mirrorAccountCreate(a: Account) {
  void fetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(a),
  }).catch(() => {});
}
function mirrorAccountUpdate(id: string, patch: Partial<Account>) {
  void fetch(`/api/accounts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
}
function mirrorAccountDelete(id: string) {
  void fetch(`/api/accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }).catch(() => {});
}

export const useContactsStore = create<ContactsStore>()(
  persist(
    (set, get) => ({
      accounts: DEFAULT_ACCOUNTS,
      contacts: DEFAULT_CONTACTS,
      contactsHydrated: false,
      accountsHydrated: false,

      addAccount: (account) => {
        const row: Account = { ...account, id: genId("acc") };
        set((state) => ({ accounts: [...state.accounts, row] }));
        mirrorAccountCreate(row);
      },

      updateAccount: (id, data) => {
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === id ? { ...a, ...data } : a,
          ),
        }));
        mirrorAccountUpdate(id, data);
      },

      deleteAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
        }));
        mirrorAccountDelete(id);
      },

      hydrateAccountsFromServer: async () => {
        try {
          const res = await fetch("/api/accounts", { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as { accounts?: Account[] };
          if (Array.isArray(body.accounts) && body.accounts.length > 0) {
            set({ accounts: body.accounts, accountsHydrated: true });
          } else if (Array.isArray(body.accounts)) {
            if (shouldSeedFixtures()) {
              set({ accounts: DEFAULT_ACCOUNTS, accountsHydrated: true });
            } else {
              set({ accounts: [], accountsHydrated: true });
            }
          }
        } catch {
          if (!get().accountsHydrated) set({ accountsHydrated: false });
        }
      },

      addContact: (contact) => {
        const row: Contact = { ...contact, id: genId("c") };
        set((state) => ({ contacts: [...state.contacts, row] }));
        mirrorCreate(row);
      },

      updateContact: (id, data) => {
        set((state) => ({
          contacts: state.contacts.map((c) =>
            c.id === id ? { ...c, ...data } : c,
          ),
        }));
        mirrorUpdate(id, data);
      },

      deleteContact: (id) => {
        set((state) => ({
          contacts: state.contacts.filter((c) => c.id !== id),
        }));
        mirrorDelete(id);
      },

      hydrateContactsFromServer: async () => {
        try {
          const res = await fetch("/api/contacts", { cache: "no-store" });
          if (!res.ok) return;
          const body = (await res.json()) as { contacts?: Contact[] };
          if (Array.isArray(body.contacts) && body.contacts.length > 0) {
            set({ contacts: body.contacts, contactsHydrated: true });
          } else if (Array.isArray(body.contacts)) {
            // Empty DB → demo session keeps fixture; real signups stay clean.
            if (shouldSeedFixtures()) {
              set({ contacts: DEFAULT_CONTACTS, contactsHydrated: true });
            } else {
              set({ contacts: [], contactsHydrated: true });
            }
          }
        } catch {
          if (!get().contactsHydrated) set({ contactsHydrated: false });
        }
      },

      addTag: (contactId, tag) => {
        const next = get().contacts.find((c) => c.id === contactId);
        if (next && !next.tags.includes(tag)) {
          const tags = [...next.tags, tag];
          set((state) => ({
            contacts: state.contacts.map((c) =>
              c.id === contactId ? { ...c, tags } : c,
            ),
          }));
          mirrorUpdate(contactId, { tags });
        }
      },

      removeTag: (contactId, tag) => {
        const next = get().contacts.find((c) => c.id === contactId);
        if (next) {
          const tags = next.tags.filter((t) => t !== tag);
          set((state) => ({
            contacts: state.contacts.map((c) =>
              c.id === contactId ? { ...c, tags } : c,
            ),
          }));
          mirrorUpdate(contactId, { tags });
        }
      },

      importAccounts: (rows) =>
        set((state) => {
          const newAccounts: Account[] = rows.map((row) => ({
            id: genId("acc"),
            name: row.name || "Unnamed",
            industry: row.industry || "Other",
            website: row.website || "",
            phone: row.phone || "",
            revenue: Number(row.revenue) || 0,
            employees: Number(row.employees) || 0,
            owner: row.owner || "Unassigned",
            status: (row.status as AccountStatus) || "Prospect",
          }));
          return { accounts: [...state.accounts, ...newAccounts] };
        }),

      importContacts: (rows) =>
        set((state) => {
          const newContacts: Contact[] = rows.map((row) => {
            const matchingAccount = state.accounts.find(
              (a) => a.name.toLowerCase() === (row.company || "").toLowerCase(),
            );
            return {
              id: genId("c"),
              name: row.name || "Unnamed",
              email: row.email || "",
              phone: row.phone || "",
              company: row.company || "",
              accountId: matchingAccount?.id || "",
              title: row.title || "",
              department: row.department || "",
              lastContact: new Date().toISOString().slice(0, 10),
              tags: row.tags
                ? (row.tags.split(",").map((t) => t.trim()) as ContactTag[])
                : [],
            };
          });
          return { contacts: [...state.contacts, ...newContacts] };
        }),
    }),
    {
      name: "vyne-contacts",
    },
  ),
);

// ── Realtime subscription ──────────────────────────────────────────
let _contactsRtBound = false;
export function bindContactsRealtime(orgId = "demo") {
  if (_contactsRtBound || !isRealtimeEnabled()) return;
  _contactsRtBound = true;
  rtSubscribe<Contact>(`org-${orgId}`, "contact:created", (c) => {
    useContactsStore.setState((s) => {
      if (s.contacts.some((x) => x.id === c.id)) return s;
      return { contacts: [c, ...s.contacts] };
    });
  });
  rtSubscribe<Contact>(`org-${orgId}`, "contact:updated", (c) => {
    useContactsStore.setState((s) => ({
      contacts: s.contacts.map((x) => (x.id === c.id ? { ...x, ...c } : x)),
    }));
  });
  rtSubscribe<{ id: string }>(`org-${orgId}`, "contact:deleted", ({ id }) => {
    useContactsStore.setState((s) => ({
      contacts: s.contacts.filter((c) => c.id !== id),
    }));
  });
  rtSubscribe<Account>(`org-${orgId}`, "account:created", (a) => {
    useContactsStore.setState((s) => {
      if (s.accounts.some((x) => x.id === a.id)) return s;
      return { accounts: [...s.accounts, a] };
    });
  });
  rtSubscribe<Account>(`org-${orgId}`, "account:updated", (a) => {
    useContactsStore.setState((s) => ({
      accounts: s.accounts.map((x) => (x.id === a.id ? { ...x, ...a } : x)),
    }));
  });
  rtSubscribe<{ id: string }>(`org-${orgId}`, "account:deleted", ({ id }) => {
    useContactsStore.setState((s) => ({
      accounts: s.accounts.filter((a) => a.id !== id),
    }));
  });
}
