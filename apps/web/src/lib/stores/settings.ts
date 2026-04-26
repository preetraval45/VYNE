import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────
export interface OrgSettings {
  name: string;
  logo: string;
  timezone: string;
  language: string;
  defaultCurrency: string;
  fiscalYearStart: string;
}

export interface NotificationSettings {
  emailDigest: "daily" | "weekly" | "never";
  pushEnabled: boolean;
  emailEnabled: boolean;
  aiAlerts: boolean;
  mentionAlerts: boolean;
  orderAlerts: boolean;
  deployAlerts: boolean;
  /** Do-not-disturb mode — master toggle */
  dndEnabled: boolean;
  /** Scheduled quiet hours in 24h time (e.g. "22:00") */
  dndStart: string;
  dndEnd: string;
  /** Which days DND applies — 0=Sun … 6=Sat */
  dndDays: number[];
}

export interface ErpSettings {
  customFields: CustomField[];
  taxRates: TaxRate[];
  defaultWarehouse: string;
  lowStockThreshold: number;
  autoReorder: boolean;
}

export interface AppearanceSettings {
  compactMode: boolean;
  showAvatars: boolean;
  animationsEnabled: boolean;
}

export interface CustomField {
  id: string;
  entity: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "boolean";
  required: boolean;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
}

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
  status: "active" | "invited";
  joinedAt?: string;
}

// ─── Store ────────────────────────────────────────────────────────
interface SettingsStore {
  orgSettings: OrgSettings;
  notificationSettings: NotificationSettings;
  erpSettings: ErpSettings;
  appearance: AppearanceSettings;
  members: OrgMember[];

  updateOrgSettings: (patch: Partial<OrgSettings>) => Promise<void>;
  updateNotificationSettings: (
    patch: Partial<NotificationSettings>,
  ) => Promise<void>;
  updateErpSettings: (patch: Partial<ErpSettings>) => Promise<void>;
  updateAppearance: (patch: Partial<AppearanceSettings>) => Promise<void>;

  // Members
  setMembers: (members: OrgMember[]) => void;
  addMember: (member: OrgMember) => void;
  updateMemberRole: (id: string, role: OrgMember["role"]) => Promise<void>;
  removeMember: (id: string) => Promise<void>;

  // ERP helpers
  addCustomField: (field: CustomField) => void;
  removeCustomField: (id: string) => void;
  addTaxRate: (rate: TaxRate) => void;
  removeTaxRate: (id: string) => void;
  setDefaultTaxRate: (id: string) => void;
}

const DEFAULT_ORG: OrgSettings = {
  name: "Vyne HQ",
  logo: "",
  timezone: "America/New_York",
  language: "en",
  defaultCurrency: "USD",
  fiscalYearStart: "1",
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  emailDigest: "weekly",
  pushEnabled: false,
  emailEnabled: true,
  aiAlerts: true,
  mentionAlerts: true,
  orderAlerts: true,
  deployAlerts: true,
  dndEnabled: false,
  dndStart: "22:00",
  dndEnd: "08:00",
  dndDays: [0, 1, 2, 3, 4, 5, 6],
};

const DEFAULT_ERP: ErpSettings = {
  customFields: [
    {
      id: "cf1",
      entity: "Product",
      label: "Warranty Period",
      type: "text",
      required: false,
    },
    {
      id: "cf2",
      entity: "Order",
      label: "PO Reference",
      type: "text",
      required: false,
    },
    {
      id: "cf3",
      entity: "Customer",
      label: "Industry",
      type: "select",
      required: false,
    },
  ],
  taxRates: [
    { id: "t1", name: "Standard VAT", rate: 20, isDefault: true },
    { id: "t2", name: "Reduced VAT", rate: 5, isDefault: false },
    { id: "t3", name: "Zero Rated", rate: 0, isDefault: false },
  ],
  defaultWarehouse: "main",
  lowStockThreshold: 10,
  autoReorder: true,
};

const DEFAULT_APPEARANCE: AppearanceSettings = {
  compactMode: false,
  showAvatars: true,
  animationsEnabled: true,
};

const DEFAULT_MEMBERS: OrgMember[] = [
  {
    id: "u1",
    name: "Preet Raval",
    email: "preet@vyne.ai",
    role: "admin",
    status: "active",
    joinedAt: "2024-01-01",
  },
  {
    id: "u2",
    name: "Sarah K.",
    email: "sarah@vyne.ai",
    role: "member",
    status: "active",
    joinedAt: "2024-03-15",
  },
  {
    id: "u3",
    name: "Tony M.",
    email: "tony@vyne.ai",
    role: "member",
    status: "active",
    joinedAt: "2024-04-01",
  },
  {
    id: "u4",
    name: "Alex R.",
    email: "alex@vyne.ai",
    role: "viewer",
    status: "active",
    joinedAt: "2024-06-10",
  },
  {
    id: "u5",
    name: "Jordan B.",
    email: "jordan@company.com",
    role: "member",
    status: "invited",
  },
];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      orgSettings: DEFAULT_ORG,
      notificationSettings: DEFAULT_NOTIFICATIONS,
      erpSettings: DEFAULT_ERP,
      appearance: DEFAULT_APPEARANCE,
      members: DEFAULT_MEMBERS,

      // Settings updates: optimistic + persist locally. The api-gateway
      // service is not deployed yet, so /api/settings/* returns 404. Until
      // it lands we keep the optimistic state — the zustand `persist`
      // middleware writes to localStorage so changes survive reload.
      // Once the gateway is live we can switch back to revert-on-error.
      updateOrgSettings: async (patch) => {
        const prev = get().orgSettings;
        const next = { ...prev, ...patch };
        set({ orgSettings: next });
        try {
          await apiClient.patch("/api/settings/org", next);
        } catch {
          // Backend offline — keep the local optimistic state.
        }
      },

      updateNotificationSettings: async (patch) => {
        const prev = get().notificationSettings;
        const next = { ...prev, ...patch };
        set({ notificationSettings: next });
        try {
          await apiClient.patch("/api/settings/notifications", next);
        } catch {
          // keep local
        }
      },

      updateErpSettings: async (patch) => {
        const prev = get().erpSettings;
        const next = { ...prev, ...patch };
        set({ erpSettings: next });
        try {
          await apiClient.patch("/api/settings/erp", next);
        } catch {
          // keep local
        }
      },

      updateAppearance: async (patch) => {
        const prev = get().appearance;
        const next = { ...prev, ...patch };
        set({ appearance: next });
        try {
          await apiClient.patch("/api/settings/appearance", next);
        } catch {
          // keep local
        }
      },

      setMembers: (members) => set({ members }),

      addMember: (member) => set((s) => ({ members: [...s.members, member] })),

      updateMemberRole: async (id, role) => {
        const prev = get().members;
        set({ members: prev.map((m) => (m.id === id ? { ...m, role } : m)) });
        try {
          await apiClient.patch(`/api/settings/members/${id}/role`, { role });
        } catch {
          set({ members: prev });
          throw new Error("Failed to update member role");
        }
      },

      removeMember: async (id) => {
        const prev = get().members;
        set({ members: prev.filter((m) => m.id !== id) });
        try {
          await apiClient.delete(`/api/settings/members/${id}`);
        } catch {
          set({ members: prev });
          throw new Error("Failed to remove member");
        }
      },

      addCustomField: (field) =>
        set((s) => ({
          erpSettings: {
            ...s.erpSettings,
            customFields: [...s.erpSettings.customFields, field],
          },
        })),

      removeCustomField: (id) =>
        set((s) => ({
          erpSettings: {
            ...s.erpSettings,
            customFields: s.erpSettings.customFields.filter((f) => f.id !== id),
          },
        })),

      addTaxRate: (rate) =>
        set((s) => ({
          erpSettings: {
            ...s.erpSettings,
            taxRates: [...s.erpSettings.taxRates, rate],
          },
        })),

      removeTaxRate: (id) =>
        set((s) => ({
          erpSettings: {
            ...s.erpSettings,
            taxRates: s.erpSettings.taxRates.filter((t) => t.id !== id),
          },
        })),

      setDefaultTaxRate: (id) =>
        set((s) => ({
          erpSettings: {
            ...s.erpSettings,
            taxRates: s.erpSettings.taxRates.map((t) => ({
              ...t,
              isDefault: t.id === id,
            })),
          },
        })),
    }),
    {
      name: "vyne-settings",
      partialize: (state) => ({
        orgSettings: state.orgSettings,
        notificationSettings: state.notificationSettings,
        erpSettings: state.erpSettings,
        appearance: state.appearance,
        members: state.members,
      }),
    },
  ),
);

// ─── Selector hooks ──────────────────────────────────────────────
export const useOrgSettings = () => useSettingsStore((s) => s.orgSettings);
export const useNotificationSettings = () =>
  useSettingsStore((s) => s.notificationSettings);
export const useErpSettings = () => useSettingsStore((s) => s.erpSettings);
export const useAppearance = () => useSettingsStore((s) => s.appearance);
export const useMembers = () => useSettingsStore((s) => s.members);
