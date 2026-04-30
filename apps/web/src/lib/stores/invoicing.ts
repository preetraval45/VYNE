import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useFinanceStore } from "@/lib/stores/finance";
import { MOCK_ACCOUNTS } from "@/lib/fixtures/finance";
import type { ERPJournalEntry } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────
export type CustomerStatus = "Active" | "Inactive";
export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";
export type CreditNoteStatus = "Draft" | "Applied" | "Refunded";
export type PaymentMethod = "Bank Transfer" | "Credit Card" | "Check";
export type PaymentStatus = "Completed" | "Pending" | "Failed";
export type VendorStatus = "Active" | "Inactive";
export type BillStatus = "Draft" | "Received" | "Paid" | "Overdue";
export type RefundType = "Customer Refund" | "Vendor Refund";
export type RefundStatus = "Processed" | "Pending" | "Cancelled";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalRevenue: number;
  outstandingBalance: number;
  lastInvoice: string;
  status: CustomerStatus;
}

export interface InvoiceLineItem {
  description: string;
  qty: number;
  rate: number;
}

export interface Invoice {
  id: string;
  number: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  items: InvoiceLineItem[];
  notes: string;
  status: InvoiceStatus;
}

export interface CreditNote {
  id: string;
  number: string;
  customer: string;
  originalInvoice: string;
  amount: number;
  reason: string;
  date: string;
  status: CreditNoteStatus;
}

export interface Payment {
  id: string;
  number: string;
  customer: string;
  invoice: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  status: PaymentStatus;
}

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  totalPurchased: number;
  outstanding: number;
  status: VendorStatus;
}

export interface BillLineItem {
  description: string;
  qty: number;
  rate: number;
}

export interface Bill {
  id: string;
  number: string;
  vendor: string;
  date: string;
  dueDate: string;
  amount: number;
  items: BillLineItem[];
  status: BillStatus;
}

export interface Refund {
  id: string;
  number: string;
  customerOrVendor: string;
  type: RefundType;
  amount: number;
  reason: string;
  date: string;
  status: RefundStatus;
}

// ─── Initial Mock Data ────────────────────────────────────────────
const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Acme Corp",
    email: "billing@acmecorp.com",
    phone: "(415) 555-0101",
    totalRevenue: 248500,
    outstandingBalance: 12400,
    lastInvoice: "2026-03-15",
    status: "Active",
  },
  {
    id: "c2",
    name: "Globex Industries",
    email: "ap@globex.io",
    phone: "(312) 555-0202",
    totalRevenue: 187200,
    outstandingBalance: 0,
    lastInvoice: "2026-03-10",
    status: "Active",
  },
  {
    id: "c3",
    name: "Initech LLC",
    email: "finance@initech.com",
    phone: "(512) 555-0303",
    totalRevenue: 94300,
    outstandingBalance: 8750,
    lastInvoice: "2026-02-28",
    status: "Active",
  },
  {
    id: "c4",
    name: "Soylent Corp",
    email: "accounts@soylent.co",
    phone: "(646) 555-0404",
    totalRevenue: 156800,
    outstandingBalance: 23100,
    lastInvoice: "2026-03-18",
    status: "Active",
  },
  {
    id: "c5",
    name: "Umbrella Inc",
    email: "payments@umbrella.com",
    phone: "(213) 555-0505",
    totalRevenue: 72100,
    outstandingBalance: 0,
    lastInvoice: "2026-01-22",
    status: "Inactive",
  },
  {
    id: "c6",
    name: "Wayne Enterprises",
    email: "ar@wayne.com",
    phone: "(305) 555-0606",
    totalRevenue: 312600,
    outstandingBalance: 45000,
    lastInvoice: "2026-03-20",
    status: "Active",
  },
  {
    id: "c7",
    name: "Stark Solutions",
    email: "billing@stark.io",
    phone: "(617) 555-0707",
    totalRevenue: 201400,
    outstandingBalance: 15600,
    lastInvoice: "2026-03-12",
    status: "Active",
  },
  {
    id: "c8",
    name: "Pied Piper Inc",
    email: "invoices@piedpiper.com",
    phone: "(408) 555-0808",
    totalRevenue: 43200,
    outstandingBalance: 0,
    lastInvoice: "2025-12-15",
    status: "Inactive",
  },
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: "i1",
    number: "INV-2026-001",
    customer: "Wayne Enterprises",
    date: "2026-03-20",
    dueDate: "2026-04-19",
    amount: 45000,
    items: [
      { description: "Enterprise Software License", qty: 1, rate: 45000 },
    ],
    notes: "",
    status: "Sent",
  },
  {
    id: "i2",
    number: "INV-2026-002",
    customer: "Soylent Corp",
    date: "2026-03-18",
    dueDate: "2026-04-17",
    amount: 23100,
    items: [{ description: "Consulting Services", qty: 1, rate: 23100 }],
    notes: "",
    status: "Sent",
  },
  {
    id: "i3",
    number: "INV-2026-003",
    customer: "Acme Corp",
    date: "2026-03-15",
    dueDate: "2026-04-14",
    amount: 12400,
    items: [{ description: "Monthly SaaS Subscription", qty: 1, rate: 12400 }],
    notes: "",
    status: "Draft",
  },
  {
    id: "i4",
    number: "INV-2026-004",
    customer: "Stark Solutions",
    date: "2026-03-12",
    dueDate: "2026-04-11",
    amount: 15600,
    items: [{ description: "Development Services", qty: 1, rate: 15600 }],
    notes: "",
    status: "Sent",
  },
  {
    id: "i5",
    number: "INV-2026-005",
    customer: "Globex Industries",
    date: "2026-03-10",
    dueDate: "2026-04-09",
    amount: 34200,
    items: [{ description: "Annual License Renewal", qty: 1, rate: 34200 }],
    notes: "",
    status: "Paid",
  },
  {
    id: "i6",
    number: "INV-2026-006",
    customer: "Initech LLC",
    date: "2026-02-28",
    dueDate: "2026-03-30",
    amount: 8750,
    items: [{ description: "Support Package", qty: 1, rate: 8750 }],
    notes: "",
    status: "Overdue",
  },
  {
    id: "i7",
    number: "INV-2026-007",
    customer: "Acme Corp",
    date: "2026-02-15",
    dueDate: "2026-03-17",
    amount: 28500,
    items: [{ description: "Custom Integration", qty: 1, rate: 28500 }],
    notes: "",
    status: "Paid",
  },
  {
    id: "i8",
    number: "INV-2026-008",
    customer: "Wayne Enterprises",
    date: "2026-02-10",
    dueDate: "2026-03-12",
    amount: 67600,
    items: [{ description: "Platform Migration", qty: 1, rate: 67600 }],
    notes: "",
    status: "Paid",
  },
  {
    id: "i9",
    number: "INV-2026-009",
    customer: "Pied Piper Inc",
    date: "2026-01-20",
    dueDate: "2026-02-19",
    amount: 12800,
    items: [{ description: "API Development", qty: 1, rate: 12800 }],
    notes: "",
    status: "Cancelled",
  },
  {
    id: "i10",
    number: "INV-2026-010",
    customer: "Soylent Corp",
    date: "2026-01-05",
    dueDate: "2026-02-04",
    amount: 41500,
    items: [{ description: "Data Analytics Suite", qty: 1, rate: 41500 }],
    notes: "",
    status: "Paid",
  },
];

const INITIAL_CREDIT_NOTES: CreditNote[] = [
  {
    id: "cn1",
    number: "CN-2026-001",
    customer: "Acme Corp",
    originalInvoice: "INV-2026-007",
    amount: 4200,
    reason: "Partial service credit",
    date: "2026-02-20",
    status: "Applied",
  },
  {
    id: "cn2",
    number: "CN-2026-002",
    customer: "Pied Piper Inc",
    originalInvoice: "INV-2026-009",
    amount: 12800,
    reason: "Full cancellation refund",
    date: "2026-01-25",
    status: "Refunded",
  },
  {
    id: "cn3",
    number: "CN-2026-003",
    customer: "Globex Industries",
    originalInvoice: "INV-2026-005",
    amount: 2100,
    reason: "Billing adjustment",
    date: "2026-03-14",
    status: "Draft",
  },
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: "p1",
    number: "PAY-2026-001",
    customer: "Globex Industries",
    invoice: "INV-2026-005",
    amount: 34200,
    method: "Bank Transfer",
    date: "2026-03-18",
    status: "Completed",
  },
  {
    id: "p2",
    number: "PAY-2026-002",
    customer: "Acme Corp",
    invoice: "INV-2026-007",
    amount: 24300,
    method: "Credit Card",
    date: "2026-03-02",
    status: "Completed",
  },
  {
    id: "p3",
    number: "PAY-2026-003",
    customer: "Wayne Enterprises",
    invoice: "INV-2026-008",
    amount: 67600,
    method: "Bank Transfer",
    date: "2026-03-05",
    status: "Completed",
  },
  {
    id: "p4",
    number: "PAY-2026-004",
    customer: "Soylent Corp",
    invoice: "INV-2026-010",
    amount: 41500,
    method: "Check",
    date: "2026-02-01",
    status: "Completed",
  },
  {
    id: "p5",
    number: "PAY-2026-005",
    customer: "Stark Solutions",
    invoice: "INV-2026-004",
    amount: 15600,
    method: "Credit Card",
    date: "2026-03-20",
    status: "Pending",
  },
  {
    id: "p6",
    number: "PAY-2026-006",
    customer: "Initech LLC",
    invoice: "INV-2026-006",
    amount: 8750,
    method: "Bank Transfer",
    date: "2026-03-21",
    status: "Failed",
  },
];

const INITIAL_VENDORS: Vendor[] = [
  {
    id: "v1",
    name: "CloudHost Pro",
    contact: "Sarah Chen",
    email: "billing@cloudhostpro.com",
    phone: "(555) 100-0001",
    totalPurchased: 86400,
    outstanding: 7200,
    status: "Active",
  },
  {
    id: "v2",
    name: "Office Depot",
    contact: "Mike Johnson",
    email: "business@officedepot.com",
    phone: "(555) 100-0002",
    totalPurchased: 23100,
    outstanding: 0,
    status: "Active",
  },
  {
    id: "v3",
    name: "TechSupply Co",
    contact: "Raj Patel",
    email: "sales@techsupply.com",
    phone: "(555) 100-0003",
    totalPurchased: 142800,
    outstanding: 18500,
    status: "Active",
  },
  {
    id: "v4",
    name: "Legal Eagles LLP",
    contact: "Diana Prince",
    email: "invoicing@legaleagles.com",
    phone: "(555) 100-0004",
    totalPurchased: 54000,
    outstanding: 12000,
    status: "Active",
  },
  {
    id: "v5",
    name: "GreenClean Services",
    contact: "Tom Hardy",
    email: "accounts@greenclean.co",
    phone: "(555) 100-0005",
    totalPurchased: 18600,
    outstanding: 0,
    status: "Inactive",
  },
];

const INITIAL_BILLS: Bill[] = [
  {
    id: "b1",
    number: "BILL-2026-001",
    vendor: "CloudHost Pro",
    date: "2026-03-01",
    dueDate: "2026-03-31",
    amount: 7200,
    items: [{ description: "Cloud hosting monthly", qty: 1, rate: 7200 }],
    status: "Received",
  },
  {
    id: "b2",
    number: "BILL-2026-002",
    vendor: "TechSupply Co",
    date: "2026-03-05",
    dueDate: "2026-04-04",
    amount: 18500,
    items: [{ description: "Hardware order", qty: 1, rate: 18500 }],
    status: "Received",
  },
  {
    id: "b3",
    number: "BILL-2026-003",
    vendor: "Legal Eagles LLP",
    date: "2026-02-15",
    dueDate: "2026-03-17",
    amount: 12000,
    items: [{ description: "Legal retainer", qty: 1, rate: 12000 }],
    status: "Overdue",
  },
  {
    id: "b4",
    number: "BILL-2026-004",
    vendor: "Office Depot",
    date: "2026-02-20",
    dueDate: "2026-03-22",
    amount: 4800,
    items: [{ description: "Office supplies", qty: 1, rate: 4800 }],
    status: "Paid",
  },
  {
    id: "b5",
    number: "BILL-2026-005",
    vendor: "GreenClean Services",
    date: "2026-01-10",
    dueDate: "2026-02-09",
    amount: 3100,
    items: [{ description: "Cleaning services", qty: 1, rate: 3100 }],
    status: "Paid",
  },
  {
    id: "b6",
    number: "BILL-2026-006",
    vendor: "CloudHost Pro",
    date: "2026-03-15",
    dueDate: "2026-04-14",
    amount: 7200,
    items: [{ description: "Cloud hosting monthly", qty: 1, rate: 7200 }],
    status: "Draft",
  },
];

const INITIAL_REFUNDS: Refund[] = [
  {
    id: "r1",
    number: "REF-2026-001",
    customerOrVendor: "Pied Piper Inc",
    type: "Customer Refund",
    amount: 12800,
    reason: "Project cancellation",
    date: "2026-01-28",
    status: "Processed",
  },
  {
    id: "r2",
    number: "REF-2026-002",
    customerOrVendor: "Office Depot",
    type: "Vendor Refund",
    amount: 1200,
    reason: "Defective supplies returned",
    date: "2026-02-25",
    status: "Processed",
  },
  {
    id: "r3",
    number: "REF-2026-003",
    customerOrVendor: "Acme Corp",
    type: "Customer Refund",
    amount: 4200,
    reason: "Service credit applied",
    date: "2026-03-01",
    status: "Pending",
  },
  {
    id: "r4",
    number: "REF-2026-004",
    customerOrVendor: "TechSupply Co",
    type: "Vendor Refund",
    amount: 3400,
    reason: "Returned hardware",
    date: "2026-03-10",
    status: "Cancelled",
  },
];

// ─── Helper to generate IDs ──────────────────────────────────────
let counter = Date.now();
function genId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

function nextNumber(existing: { number: string }[], prefix: string): string {
  const nums = existing
    .map((e) => {
      const match = e.number.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

// ─── Store Interface ──────────────────────────────────────────────
interface InvoicingStore {
  customers: Customer[];
  invoices: Invoice[];
  creditNotes: CreditNote[];
  payments: Payment[];
  vendors: Vendor[];
  bills: Bill[];
  refunds: Refund[];

  // Customers
  addCustomer: (
    data: Omit<
      Customer,
      "id" | "totalRevenue" | "outstandingBalance" | "lastInvoice" | "status"
    >,
  ) => void;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Invoices
  addInvoice: (data: {
    customer: string;
    items: InvoiceLineItem[];
    dueDate: string;
    notes: string;
  }) => void;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  markAsPaid: (id: string) => void;
  sendInvoice: (id: string) => void;

  // Credit Notes
  addCreditNote: (data: {
    customer: string;
    originalInvoice: string;
    amount: number;
    reason: string;
  }) => void;
  deleteCreditNote: (id: string) => void;

  // Payments
  addPayment: (data: {
    customer: string;
    invoice: string;
    amount: number;
    method: PaymentMethod;
    date: string;
  }) => void;
  deletePayment: (id: string) => void;

  // Vendors
  addVendor: (
    data: Omit<Vendor, "id" | "totalPurchased" | "outstanding" | "status">,
  ) => void;
  updateVendor: (id: string, data: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;

  // Bills
  addBill: (data: {
    vendor: string;
    items: BillLineItem[];
    dueDate: string;
  }) => void;
  updateBill: (id: string, data: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (id: string) => void;

  // Refunds
  addRefund: (data: {
    customerOrVendor: string;
    type: RefundType;
    amount: number;
    reason: string;
  }) => void;
  deleteRefund: (id: string) => void;
}

export const useInvoicingStore = create<InvoicingStore>()(
  persist(
    (set) => ({
      customers: INITIAL_CUSTOMERS,
      invoices: INITIAL_INVOICES,
      creditNotes: INITIAL_CREDIT_NOTES,
      payments: INITIAL_PAYMENTS,
      vendors: INITIAL_VENDORS,
      bills: INITIAL_BILLS,
      refunds: INITIAL_REFUNDS,

      // ── Customers ──────────────────────────────────
      addCustomer: (data) =>
        set((state) => ({
          customers: [
            ...state.customers,
            {
              id: genId("c"),
              name: data.name,
              email: data.email,
              phone: data.phone,
              totalRevenue: 0,
              outstandingBalance: 0,
              lastInvoice: new Date().toISOString().slice(0, 10),
              status: "Active",
            },
          ],
        })),

      updateCustomer: (id, data) =>
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, ...data } : c,
          ),
        })),

      deleteCustomer: (id) =>
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        })),

      // ── Invoices ───────────────────────────────────
      addInvoice: (data) => {
        const amount = data.items.reduce((s, li) => s + li.qty * li.rate, 0);
        const today = new Date().toISOString().slice(0, 10);
        let num = "";
        set((state) => {
          num = nextNumber(state.invoices, "INV-2026-");
          return {
            invoices: [
              ...state.invoices,
              {
                id: genId("i"),
                number: num,
                customer: data.customer,
                date: today,
                dueDate: data.dueDate,
                amount,
                items: data.items,
                notes: data.notes,
                status: "Draft",
              },
            ],
          };
        });

        // Wire to general ledger: Dr Accounts Receivable / Cr Sales Revenue
        const finance = useFinanceStore.getState();
        const arAccount =
          MOCK_ACCOUNTS.find((a) => a.name === "Accounts Receivable")?.name ??
          "Accounts Receivable";
        const revenueAccount =
          MOCK_ACCOUNTS.find(
            (a) => a.name === "Sales Revenue" || a.name === "Revenue",
          )?.name ?? "Revenue";
        const memo = `Invoice ${num} — ${data.customer}`;
        const journalEntry: ERPJournalEntry = {
          id: `j_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          entryNumber: `JE-${String(finance.journalEntries.length + 1).padStart(3, "0")}`,
          description: memo,
          postingDate: new Date(today).toISOString(),
          status: "posted",
          totalDebits: amount,
          memo,
          lines: [
            { account: arAccount, debit: amount, credit: 0 },
            { account: revenueAccount, debit: 0, credit: amount },
          ],
        };
        finance.addJournalEntry(journalEntry);
      },

      updateInvoice: (id, data) =>
        set((state) => ({
          invoices: state.invoices.map((inv) => {
            if (inv.id !== id) return inv;
            const updated = { ...inv, ...data };
            if (data.items) {
              updated.amount = data.items.reduce(
                (s, li) => s + li.qty * li.rate,
                0,
              );
            }
            return updated;
          }),
        })),

      deleteInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
        })),

      markAsPaid: (id) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, status: "Paid" as InvoiceStatus } : inv,
          ),
        })),

      sendInvoice: (id) =>
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, status: "Sent" as InvoiceStatus } : inv,
          ),
        })),

      // ── Credit Notes ───────────────────────────────
      addCreditNote: (data) =>
        set((state) => {
          const num = nextNumber(state.creditNotes, "CN-2026-");
          return {
            creditNotes: [
              ...state.creditNotes,
              {
                id: genId("cn"),
                number: num,
                customer: data.customer,
                originalInvoice: data.originalInvoice,
                amount: data.amount,
                reason: data.reason,
                date: new Date().toISOString().slice(0, 10),
                status: "Draft",
              },
            ],
          };
        }),

      deleteCreditNote: (id) =>
        set((state) => ({
          creditNotes: state.creditNotes.filter((cn) => cn.id !== id),
        })),

      // ── Payments ───────────────────────────────────
      addPayment: (data) =>
        set((state) => {
          const num = nextNumber(state.payments, "PAY-2026-");
          return {
            payments: [
              ...state.payments,
              {
                id: genId("p"),
                number: num,
                customer: data.customer,
                invoice: data.invoice,
                amount: data.amount,
                method: data.method,
                date: data.date,
                status: "Completed" as PaymentStatus,
              },
            ],
          };
        }),

      deletePayment: (id) =>
        set((state) => ({
          payments: state.payments.filter((p) => p.id !== id),
        })),

      // ── Vendors ────────────────────────────────────
      addVendor: (data) =>
        set((state) => ({
          vendors: [
            ...state.vendors,
            {
              id: genId("v"),
              name: data.name,
              contact: data.contact,
              email: data.email,
              phone: data.phone,
              totalPurchased: 0,
              outstanding: 0,
              status: "Active",
            },
          ],
        })),

      updateVendor: (id, data) =>
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === id ? { ...v, ...data } : v,
          ),
        })),

      deleteVendor: (id) =>
        set((state) => ({
          vendors: state.vendors.filter((v) => v.id !== id),
        })),

      // ── Bills ──────────────────────────────────────
      addBill: (data) =>
        set((state) => {
          const amount = data.items.reduce((s, li) => s + li.qty * li.rate, 0);
          const num = nextNumber(state.bills, "BILL-2026-");
          return {
            bills: [
              ...state.bills,
              {
                id: genId("b"),
                number: num,
                vendor: data.vendor,
                date: new Date().toISOString().slice(0, 10),
                dueDate: data.dueDate,
                amount,
                items: data.items,
                status: "Draft",
              },
            ],
          };
        }),

      updateBill: (id, data) =>
        set((state) => ({
          bills: state.bills.map((b) => {
            if (b.id !== id) return b;
            const updated = { ...b, ...data };
            if (data.items) {
              updated.amount = data.items.reduce(
                (s, li) => s + li.qty * li.rate,
                0,
              );
            }
            return updated;
          }),
        })),

      deleteBill: (id) =>
        set((state) => ({
          bills: state.bills.filter((b) => b.id !== id),
        })),

      markBillPaid: (id) =>
        set((state) => ({
          bills: state.bills.map((b) =>
            b.id === id ? { ...b, status: "Paid" as BillStatus } : b,
          ),
        })),

      // ── Refunds ────────────────────────────────────
      addRefund: (data) =>
        set((state) => {
          const num = nextNumber(state.refunds, "REF-2026-");
          return {
            refunds: [
              ...state.refunds,
              {
                id: genId("r"),
                number: num,
                customerOrVendor: data.customerOrVendor,
                type: data.type,
                amount: data.amount,
                reason: data.reason,
                date: new Date().toISOString().slice(0, 10),
                status: "Pending",
              },
            ],
          };
        }),

      deleteRefund: (id) =>
        set((state) => ({
          refunds: state.refunds.filter((r) => r.id !== id),
        })),
    }),
    {
      name: "vyne-invoicing",
    },
  ),
);
