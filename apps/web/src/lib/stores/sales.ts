import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ───────────────────────────────────────────────────────
export type OpportunityStage =
  | "Qualification"
  | "Proposal"
  | "Negotiation"
  | "Closed Won"
  | "Closed Lost";
export type QuoteStatus = "Draft" | "Sent" | "Accepted" | "Rejected";
export type OrderStatus = "Confirmed" | "Processing" | "Shipped" | "Delivered";
export type ProductStatus = "Active" | "Low Stock" | "Out of Stock";
export type CustomerStatus = "Active" | "Inactive" | "New";

export interface Opportunity {
  id: string;
  name: string;
  company: string;
  contact: string;
  value: number;
  probability: number;
  stage: OpportunityStage;
  expectedClose: string;
  assignee: string;
  createdAt: string;
}

export interface QuoteLineItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  number: string;
  customer: string;
  date: string;
  expiry: string;
  amount: number;
  status: QuoteStatus;
  items: number;
  lineItems: QuoteLineItem[];
}

export interface SalesOrder {
  id: string;
  number: string;
  customer: string;
  date: string;
  amount: number;
  status: OrderStatus;
  tracking: string;
  items: number;
  lineItems: QuoteLineItem[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  totalOrders: number;
  totalRevenue: number;
  lastOrder: string;
  status: CustomerStatus;
}

// ─── Mock Data ───────────────────────────────────────────────────
const NOW = Date.now();
const daysAgo = (d: number) =>
  new Date(NOW - d * 86400000).toISOString().slice(0, 10);
const daysFromNow = (d: number) =>
  new Date(NOW + d * 86400000).toISOString().slice(0, 10);

const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp1",
    name: "Enterprise License Deal",
    company: "Acme Corp",
    contact: "Sarah Johnson",
    value: 120000,
    probability: 30,
    stage: "Qualification",
    expectedClose: daysFromNow(45),
    assignee: "Alex Rivera",
    createdAt: daysAgo(12),
  },
  {
    id: "opp2",
    name: "Platform Migration",
    company: "TechStart Inc",
    contact: "",
    value: 85000,
    probability: 55,
    stage: "Proposal",
    expectedClose: daysFromNow(30),
    assignee: "Priya Shah",
    createdAt: daysAgo(20),
  },
  {
    id: "opp3",
    name: "API Integration Suite",
    company: "DataFlow Ltd",
    contact: "",
    value: 64000,
    probability: 70,
    stage: "Negotiation",
    expectedClose: daysFromNow(15),
    assignee: "Sam Chen",
    createdAt: daysAgo(35),
  },
  {
    id: "opp4",
    name: "Annual SaaS Contract",
    company: "Global Retail",
    contact: "",
    value: 48000,
    probability: 40,
    stage: "Proposal",
    expectedClose: daysFromNow(25),
    assignee: "Alex Rivera",
    createdAt: daysAgo(18),
  },
  {
    id: "opp5",
    name: "Custom Analytics Module",
    company: "FinEdge Capital",
    contact: "Rachel Adams",
    value: 156000,
    probability: 60,
    stage: "Negotiation",
    expectedClose: daysFromNow(20),
    assignee: "Priya Shah",
    createdAt: daysAgo(40),
  },
  {
    id: "opp6",
    name: "Cloud Infrastructure",
    company: "ManuCo",
    contact: "",
    value: 92000,
    probability: 100,
    stage: "Closed Won",
    expectedClose: daysAgo(5),
    assignee: "Sam Chen",
    createdAt: daysAgo(60),
  },
  {
    id: "opp7",
    name: "Security Audit Package",
    company: "CloudOps Solutions",
    contact: "Derek Ng",
    value: 35000,
    probability: 25,
    stage: "Qualification",
    expectedClose: daysFromNow(50),
    assignee: "Jordan Lee",
    createdAt: daysAgo(8),
  },
  {
    id: "opp8",
    name: "Data Warehouse Setup",
    company: "PharmaLink",
    contact: "Olivia Martinez",
    value: 210000,
    probability: 45,
    stage: "Proposal",
    expectedClose: daysFromNow(35),
    assignee: "Priya Shah",
    createdAt: daysAgo(25),
  },
  {
    id: "opp9",
    name: "DevOps Consulting",
    company: "BuildWorks Inc",
    contact: "Ana Rodriguez",
    value: 28000,
    probability: 80,
    stage: "Negotiation",
    expectedClose: daysFromNow(10),
    assignee: "Alex Rivera",
    createdAt: daysAgo(30),
  },
  {
    id: "opp10",
    name: "Support Tier Upgrade",
    company: "RetailNow",
    contact: "Kevin Zhao",
    value: 18000,
    probability: 0,
    stage: "Closed Lost",
    expectedClose: daysAgo(3),
    assignee: "Jordan Lee",
    createdAt: daysAgo(45),
  },
  {
    id: "opp11",
    name: "ML Pipeline License",
    company: "GreenVolt Energy",
    contact: "Lisa Patel",
    value: 145000,
    probability: 100,
    stage: "Closed Won",
    expectedClose: daysAgo(8),
    assignee: "Sam Chen",
    createdAt: daysAgo(55),
  },
  {
    id: "opp12",
    name: "Compliance Toolkit",
    company: "EduSpark",
    contact: "Sophie Kim",
    value: 42000,
    probability: 20,
    stage: "Qualification",
    expectedClose: daysFromNow(60),
    assignee: "Jordan Lee",
    createdAt: daysAgo(5),
  },
];

const DEFAULT_QUOTES: Quote[] = [
  {
    id: "q1",
    number: "QT-2026-001",
    customer: "Acme Corp",
    date: daysAgo(3),
    expiry: daysFromNow(27),
    amount: 120000,
    status: "Sent",
    items: 5,
    lineItems: [],
  },
  {
    id: "q2",
    number: "QT-2026-002",
    customer: "TechStart Inc",
    date: daysAgo(7),
    expiry: daysFromNow(23),
    amount: 85000,
    status: "Draft",
    items: 3,
    lineItems: [],
  },
  {
    id: "q3",
    number: "QT-2026-003",
    customer: "DataFlow Ltd",
    date: daysAgo(14),
    expiry: daysFromNow(16),
    amount: 64000,
    status: "Accepted",
    items: 4,
    lineItems: [],
  },
  {
    id: "q4",
    number: "QT-2026-004",
    customer: "Global Retail",
    date: daysAgo(5),
    expiry: daysFromNow(25),
    amount: 48000,
    status: "Sent",
    items: 2,
    lineItems: [],
  },
  {
    id: "q5",
    number: "QT-2026-005",
    customer: "FinEdge Capital",
    date: daysAgo(10),
    expiry: daysFromNow(20),
    amount: 156000,
    status: "Sent",
    items: 7,
    lineItems: [],
  },
  {
    id: "q6",
    number: "QT-2026-006",
    customer: "ManuCo",
    date: daysAgo(20),
    expiry: daysAgo(5),
    amount: 92000,
    status: "Accepted",
    items: 4,
    lineItems: [],
  },
  {
    id: "q7",
    number: "QT-2026-007",
    customer: "RetailNow",
    date: daysAgo(12),
    expiry: daysFromNow(18),
    amount: 18000,
    status: "Rejected",
    items: 1,
    lineItems: [],
  },
  {
    id: "q8",
    number: "QT-2026-008",
    customer: "PharmaLink",
    date: daysAgo(2),
    expiry: daysFromNow(28),
    amount: 210000,
    status: "Draft",
    items: 8,
    lineItems: [],
  },
];

const DEFAULT_ORDERS: SalesOrder[] = [
  {
    id: "so1",
    number: "SO-2026-001",
    customer: "ManuCo",
    date: daysAgo(5),
    amount: 92000,
    status: "Delivered",
    tracking: "TRK-88291",
    items: 4,
    lineItems: [],
  },
  {
    id: "so2",
    number: "SO-2026-002",
    customer: "DataFlow Ltd",
    date: daysAgo(8),
    amount: 64000,
    status: "Shipped",
    tracking: "TRK-77142",
    items: 3,
    lineItems: [],
  },
  {
    id: "so3",
    number: "SO-2026-003",
    customer: "GreenVolt Energy",
    date: daysAgo(3),
    amount: 145000,
    status: "Processing",
    tracking: "--",
    items: 6,
    lineItems: [],
  },
  {
    id: "so4",
    number: "SO-2026-004",
    customer: "Acme Corp",
    date: daysAgo(15),
    amount: 38000,
    status: "Delivered",
    tracking: "TRK-66039",
    items: 2,
    lineItems: [],
  },
  {
    id: "so5",
    number: "SO-2026-005",
    customer: "FinEdge Capital",
    date: daysAgo(1),
    amount: 156000,
    status: "Confirmed",
    tracking: "--",
    items: 7,
    lineItems: [],
  },
  {
    id: "so6",
    number: "SO-2026-006",
    customer: "BuildWorks Inc",
    date: daysAgo(10),
    amount: 28000,
    status: "Shipped",
    tracking: "TRK-55487",
    items: 2,
    lineItems: [],
  },
  {
    id: "so7",
    number: "SO-2026-007",
    customer: "CloudOps Solutions",
    date: daysAgo(6),
    amount: 52000,
    status: "Processing",
    tracking: "--",
    items: 3,
    lineItems: [],
  },
  {
    id: "so8",
    number: "SO-2026-008",
    customer: "PharmaLink",
    date: daysAgo(2),
    amount: 210000,
    status: "Confirmed",
    tracking: "--",
    items: 8,
    lineItems: [],
  },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "VYNE Platform License",
    sku: "VPL-001",
    category: "Software",
    price: 12000,
    stock: 999,
    status: "Active",
  },
  {
    id: "p2",
    name: "API Gateway Module",
    sku: "AGM-002",
    category: "Add-ons",
    price: 4500,
    stock: 999,
    status: "Active",
  },
  {
    id: "p3",
    name: "Analytics Dashboard",
    sku: "ADH-003",
    category: "Add-ons",
    price: 3200,
    stock: 999,
    status: "Active",
  },
  {
    id: "p4",
    name: "Enterprise Support Plan",
    sku: "ESP-004",
    category: "Services",
    price: 8000,
    stock: 50,
    status: "Active",
  },
  {
    id: "p5",
    name: "Custom Integration Setup",
    sku: "CIS-005",
    category: "Services",
    price: 15000,
    stock: 20,
    status: "Active",
  },
  {
    id: "p6",
    name: "ML Pipeline Module",
    sku: "MPM-006",
    category: "Add-ons",
    price: 6800,
    stock: 999,
    status: "Active",
  },
  {
    id: "p7",
    name: "Compliance Toolkit",
    sku: "CTK-007",
    category: "Add-ons",
    price: 2400,
    stock: 5,
    status: "Low Stock",
  },
  {
    id: "p8",
    name: "Data Migration Service",
    sku: "DMS-008",
    category: "Services",
    price: 10000,
    stock: 0,
    status: "Out of Stock",
  },
  {
    id: "p9",
    name: "Security Audit Package",
    sku: "SAP-009",
    category: "Services",
    price: 7500,
    stock: 15,
    status: "Active",
  },
  {
    id: "p10",
    name: "Training Workshop (5-day)",
    sku: "TWK-010",
    category: "Training",
    price: 5000,
    stock: 8,
    status: "Low Stock",
  },
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: "cust1",
    name: "Acme Corp",
    email: "billing@acme.com",
    totalOrders: 8,
    totalRevenue: 284000,
    lastOrder: daysAgo(5),
    status: "Active",
  },
  {
    id: "cust2",
    name: "TechStart Inc",
    email: "accounts@techstart.io",
    totalOrders: 3,
    totalRevenue: 96000,
    lastOrder: daysAgo(12),
    status: "Active",
  },
  {
    id: "cust3",
    name: "DataFlow Ltd",
    email: "finance@dataflow.co",
    totalOrders: 5,
    totalRevenue: 178000,
    lastOrder: daysAgo(8),
    status: "Active",
  },
  {
    id: "cust4",
    name: "Global Retail",
    email: "procurement@globalretail.com",
    totalOrders: 2,
    totalRevenue: 48000,
    lastOrder: daysAgo(30),
    status: "Inactive",
  },
  {
    id: "cust5",
    name: "FinEdge Capital",
    email: "ops@finedge.com",
    totalOrders: 6,
    totalRevenue: 312000,
    lastOrder: daysAgo(1),
    status: "Active",
  },
  {
    id: "cust6",
    name: "ManuCo",
    email: "purchasing@manuco.com",
    totalOrders: 4,
    totalRevenue: 198000,
    lastOrder: daysAgo(5),
    status: "Active",
  },
  {
    id: "cust7",
    name: "GreenVolt Energy",
    email: "admin@greenvolt.io",
    totalOrders: 7,
    totalRevenue: 420000,
    lastOrder: daysAgo(3),
    status: "Active",
  },
  {
    id: "cust8",
    name: "EduSpark",
    email: "info@eduspark.org",
    totalOrders: 1,
    totalRevenue: 12000,
    lastOrder: daysAgo(60),
    status: "New",
  },
];

// ─── Store ───────────────────────────────────────────────────────
interface SalesStore {
  deals: Opportunity[];
  quotations: Quote[];
  salesOrders: SalesOrder[];
  products: Product[];
  customers: Customer[];

  // Deal CRUD
  addDeal: (deal: Omit<Opportunity, "id" | "createdAt">) => void;
  updateDeal: (id: string, data: Partial<Omit<Opportunity, "id">>) => void;
  deleteDeal: (id: string) => void;
  moveDealStage: (id: string, stage: OpportunityStage) => void;
  winDeal: (id: string) => void;
  loseDeal: (id: string) => void;

  // Quotation CRUD
  addQuotation: (q: {
    customer: string;
    expiry: string;
    lineItems: QuoteLineItem[];
  }) => void;
  updateQuotation: (
    id: string,
    data: Partial<Omit<Quote, "id" | "number">>,
  ) => void;
  deleteQuotation: (id: string) => void;
  acceptQuotation: (id: string) => void;
  rejectQuotation: (id: string) => void;
  sendQuotation: (id: string) => void;

  // Sales Order CRUD
  addSalesOrder: (so: { customer: string; lineItems: QuoteLineItem[] }) => void;
  updateSalesOrder: (
    id: string,
    data: Partial<Omit<SalesOrder, "id" | "number">>,
  ) => void;
  deleteSalesOrder: (id: string) => void;

  // Product CRUD
  addProduct: (p: Omit<Product, "id" | "status">) => void;
  updateProduct: (id: string, data: Partial<Omit<Product, "id">>) => void;
  deleteProduct: (id: string) => void;

  // Customer CRUD
  addCustomer: (c: Omit<Customer, "id">) => void;
  updateCustomer: (id: string, data: Partial<Omit<Customer, "id">>) => void;
  deleteCustomer: (id: string) => void;
}

let _nextId = 200;
function genId(prefix: string) {
  return `${prefix}${++_nextId}`;
}

function deriveProductStatus(stock: number): ProductStatus {
  if (stock <= 0) return "Out of Stock";
  if (stock <= 10) return "Low Stock";
  return "Active";
}

let _quoteCounter = 9;
function nextQuoteNumber() {
  return `QT-2026-${String(++_quoteCounter).padStart(3, "0")}`;
}

let _soCounter = 9;
function nextSONumber() {
  return `SO-2026-${String(++_soCounter).padStart(3, "0")}`;
}

export const useSalesStore = create<SalesStore>()(
  persist(
    (set) => ({
      deals: DEFAULT_OPPORTUNITIES,
      quotations: DEFAULT_QUOTES,
      salesOrders: DEFAULT_ORDERS,
      products: DEFAULT_PRODUCTS,
      customers: DEFAULT_CUSTOMERS,

      // ─── Deal CRUD ──────────────────────────────────
      addDeal: (deal) =>
        set((state) => ({
          deals: [
            ...state.deals,
            {
              ...deal,
              id: genId("opp"),
              createdAt: new Date().toISOString().slice(0, 10),
            },
          ],
        })),

      updateDeal: (id, data) =>
        set((state) => ({
          deals: state.deals.map((d) => (d.id === id ? { ...d, ...data } : d)),
        })),

      deleteDeal: (id) =>
        set((state) => ({
          deals: state.deals.filter((d) => d.id !== id),
        })),

      moveDealStage: (id, stage) =>
        set((state) => ({
          deals: state.deals.map((d) => {
            if (d.id !== id) return d;
            let probability = d.probability;
            if (stage === "Closed Won") probability = 100;
            else if (stage === "Closed Lost") probability = 0;
            else if (stage === "Qualification") probability = 25;
            else if (stage === "Proposal") probability = 50;
            else if (stage === "Negotiation") probability = 75;
            return { ...d, stage, probability };
          }),
        })),

      winDeal: (id) =>
        set((state) => ({
          deals: state.deals.map((d) =>
            d.id === id
              ? {
                  ...d,
                  stage: "Closed Won" as OpportunityStage,
                  probability: 100,
                }
              : d,
          ),
        })),

      loseDeal: (id) =>
        set((state) => ({
          deals: state.deals.map((d) =>
            d.id === id
              ? {
                  ...d,
                  stage: "Closed Lost" as OpportunityStage,
                  probability: 0,
                }
              : d,
          ),
        })),

      // ─── Quotation CRUD ─────────────────────────────
      addQuotation: ({ customer, expiry, lineItems }) =>
        set((state) => {
          const amount = lineItems.reduce(
            (s, li) => s + li.quantity * li.unitPrice,
            0,
          );
          const newQ: Quote = {
            id: genId("q"),
            number: nextQuoteNumber(),
            customer,
            date: new Date().toISOString().slice(0, 10),
            expiry,
            amount,
            status: "Draft",
            items: lineItems.length,
            lineItems,
          };
          return { quotations: [...state.quotations, newQ] };
        }),

      updateQuotation: (id, data) =>
        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === id ? { ...q, ...data } : q,
          ),
        })),

      deleteQuotation: (id) =>
        set((state) => ({
          quotations: state.quotations.filter((q) => q.id !== id),
        })),

      acceptQuotation: (id) =>
        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === id ? { ...q, status: "Accepted" as QuoteStatus } : q,
          ),
        })),

      rejectQuotation: (id) =>
        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === id ? { ...q, status: "Rejected" as QuoteStatus } : q,
          ),
        })),

      sendQuotation: (id) =>
        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === id && q.status === "Draft"
              ? { ...q, status: "Sent" as QuoteStatus }
              : q,
          ),
        })),

      // ─── Sales Order CRUD ──────────────────────────
      addSalesOrder: ({ customer, lineItems }) =>
        set((state) => {
          const amount = lineItems.reduce(
            (s, li) => s + li.quantity * li.unitPrice,
            0,
          );
          const newSO: SalesOrder = {
            id: genId("so"),
            number: nextSONumber(),
            customer,
            date: new Date().toISOString().slice(0, 10),
            amount,
            status: "Confirmed",
            tracking: "--",
            items: lineItems.length,
            lineItems,
          };
          return { salesOrders: [...state.salesOrders, newSO] };
        }),

      updateSalesOrder: (id, data) =>
        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === id ? { ...o, ...data } : o,
          ),
        })),

      deleteSalesOrder: (id) =>
        set((state) => ({
          salesOrders: state.salesOrders.filter((o) => o.id !== id),
        })),

      // ─── Product CRUD ──────────────────────────────
      addProduct: (p) =>
        set((state) => ({
          products: [
            ...state.products,
            { ...p, id: genId("p"), status: deriveProductStatus(p.stock) },
          ],
        })),

      updateProduct: (id, data) =>
        set((state) => ({
          products: state.products.map((p) => {
            if (p.id !== id) return p;
            const updated = { ...p, ...data };
            if (data.stock !== undefined) {
              updated.status = deriveProductStatus(data.stock);
            }
            return updated;
          }),
        })),

      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),

      // ─── Customer CRUD ─────────────────────────────
      addCustomer: (c) =>
        set((state) => ({
          customers: [...state.customers, { ...c, id: genId("cust") }],
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
    }),
    {
      name: "vyne-sales",
    },
  ),
);
