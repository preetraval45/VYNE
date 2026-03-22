export const IS_DEMO_MODE = !process.env.NEXT_PUBLIC_API_URL;

// ── Types ────────────────────────────────────────────────────────
export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "paid";
export type ExpenseCategory =
  | "travel"
  | "meals"
  | "software"
  | "office"
  | "other";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  submittedBy: string;
  status: ExpenseStatus;
  receiptUrl?: string;
  note?: string;
}

// ── Mock Data ────────────────────────────────────────────────────
export const MOCK_EXPENSES: Expense[] = [
  {
    id: "exp1",
    date: "2026-03-18",
    category: "travel",
    description: "Flight to NYC \u2014 client meeting Acme Corp",
    amount: 380,
    currency: "USD",
    submittedBy: "Preet Raval",
    status: "approved",
  },
  {
    id: "exp2",
    date: "2026-03-17",
    category: "meals",
    description: "Team lunch \u2014 sprint planning",
    amount: 142,
    currency: "USD",
    submittedBy: "Preet Raval",
    status: "paid",
  },
  {
    id: "exp3",
    date: "2026-03-15",
    category: "software",
    description: "Figma Pro subscription \u2014 annual",
    amount: 576,
    currency: "USD",
    submittedBy: "Sarah K.",
    status: "submitted",
  },
  {
    id: "exp4",
    date: "2026-03-14",
    category: "office",
    description: "Standing desk \u2014 home office",
    amount: 489,
    currency: "USD",
    submittedBy: "Tony M.",
    status: "submitted",
  },
  {
    id: "exp5",
    date: "2026-03-12",
    category: "travel",
    description: "Uber \u2014 airport to office x4",
    amount: 96,
    currency: "USD",
    submittedBy: "Alex R.",
    status: "rejected",
    note: "Exceeds $80 limit for local transport",
  },
  {
    id: "exp6",
    date: "2026-03-10",
    category: "software",
    description: "AWS cost overrun \u2014 dev environment",
    amount: 234,
    currency: "USD",
    submittedBy: "Preet Raval",
    status: "draft",
  },
  {
    id: "exp7",
    date: "2026-03-08",
    category: "meals",
    description: "Client dinner \u2014 TechStart deal close",
    amount: 312,
    currency: "USD",
    submittedBy: "Alex R.",
    status: "approved",
  },
  {
    id: "exp8",
    date: "2026-03-05",
    category: "other",
    description: "Conference ticket \u2014 SaaStr Annual",
    amount: 1200,
    currency: "USD",
    submittedBy: "Preet Raval",
    status: "paid",
  },
];

// ── Category limits ──────────────────────────────────────────────
export const CATEGORY_LIMITS: Record<ExpenseCategory, number> = {
  travel: 1000,
  meals: 150,
  software: 500,
  office: 400,
  other: 300,
};
