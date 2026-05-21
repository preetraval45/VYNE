"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedOrEmpty } from "@/lib/stores/seedMode";

// ─── Types ────────────────────────────────────────────────────────

export type FieldJobStatus =
  | "scheduled"
  | "dispatched"
  | "in_progress"
  | "on_site"
  | "completed"
  | "cancelled";

export type FieldJobPriority = "low" | "medium" | "high" | "urgent";

export type FieldRegion = "north" | "south" | "east" | "west" | "central";

export type FieldSkill =
  | "hvac"
  | "electrical"
  | "plumbing"
  | "carpentry"
  | "it"
  | "appliance";

export interface Technician {
  id: string;
  name: string;
  initials: string;
  region: FieldRegion;
  skills: FieldSkill[];
  color: string;
  /** Hours of work the tech can hold per week. Used for over-allocation
   *  warnings in the Gantt header (Phase 4b+). */
  weeklyCapacityHours: number;
}

export interface FieldJob {
  id: string;
  jobNumber: string;
  title: string;
  customerName: string;
  address: string;
  region: FieldRegion;
  skill: FieldSkill;
  priority: FieldJobPriority;
  status: FieldJobStatus;
  technicianId: string | null;
  scheduledStart: string; // ISO
  scheduledEnd: string;   // ISO
  estimatedHours: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Demo fixtures ────────────────────────────────────────────────

export const DEMO_TECHNICIANS: Technician[] = [
  {
    id: "tech-1",
    name: "Marco Lin",
    initials: "ML",
    region: "north",
    skills: ["hvac", "electrical"],
    color: "#3B82F6",
    weeklyCapacityHours: 40,
  },
  {
    id: "tech-2",
    name: "Dana Reyes",
    initials: "DR",
    region: "south",
    skills: ["plumbing", "appliance"],
    color: "#22C55E",
    weeklyCapacityHours: 40,
  },
  {
    id: "tech-3",
    name: "Sasha Patel",
    initials: "SP",
    region: "east",
    skills: ["it", "electrical"],
    color: "#A855F7",
    weeklyCapacityHours: 40,
  },
  {
    id: "tech-4",
    name: "Jordan Kim",
    initials: "JK",
    region: "west",
    skills: ["carpentry", "appliance"],
    color: "#F59E0B",
    weeklyCapacityHours: 40,
  },
  {
    id: "tech-5",
    name: "Riley O'Neill",
    initials: "RO",
    region: "central",
    skills: ["hvac", "plumbing", "appliance"],
    color: "#EC4899",
    weeklyCapacityHours: 32,
  },
];

const TODAY_ISO = new Date().toISOString().slice(0, 10);
function isoOffset(days: number, hours = 0): string {
  const d = new Date(`${TODAY_ISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hours);
  return d.toISOString();
}

export const DEMO_FIELD_JOBS: FieldJob[] = [
  {
    id: "fj-1",
    jobNumber: "FS-2026-001",
    title: "Replace rooftop HVAC compressor",
    customerName: "Northgate Mall",
    address: "12 Northgate Plaza",
    region: "north",
    skill: "hvac",
    priority: "high",
    status: "scheduled",
    technicianId: "tech-1",
    scheduledStart: isoOffset(0, 9),
    scheduledEnd: isoOffset(1, 17),
    estimatedHours: 12,
    notes: "Crane access already arranged on the loading dock.",
    createdAt: isoOffset(-3),
    updatedAt: isoOffset(-1),
  },
  {
    id: "fj-2",
    jobNumber: "FS-2026-002",
    title: "Annual electrical inspection",
    customerName: "Acme Corp",
    address: "200 Elm St",
    region: "north",
    skill: "electrical",
    priority: "medium",
    status: "scheduled",
    technicianId: "tech-1",
    scheduledStart: isoOffset(3, 9),
    scheduledEnd: isoOffset(3, 13),
    estimatedHours: 4,
    createdAt: isoOffset(-2),
    updatedAt: isoOffset(-1),
  },
  {
    id: "fj-3",
    jobNumber: "FS-2026-003",
    title: "Leak repair — main service line",
    customerName: "Bayside Diner",
    address: "9 Bay Rd",
    region: "south",
    skill: "plumbing",
    priority: "urgent",
    status: "dispatched",
    technicianId: "tech-2",
    scheduledStart: isoOffset(0, 8),
    scheduledEnd: isoOffset(0, 14),
    estimatedHours: 6,
    createdAt: isoOffset(-1),
    updatedAt: isoOffset(0),
  },
  {
    id: "fj-4",
    jobNumber: "FS-2026-004",
    title: "Dishwasher install (x3)",
    customerName: "Sunset Senior Living",
    address: "401 Sunset Ave",
    region: "south",
    skill: "appliance",
    priority: "medium",
    status: "scheduled",
    technicianId: "tech-2",
    scheduledStart: isoOffset(2, 10),
    scheduledEnd: isoOffset(2, 16),
    estimatedHours: 6,
    createdAt: isoOffset(-4),
    updatedAt: isoOffset(-1),
  },
  {
    id: "fj-5",
    jobNumber: "FS-2026-005",
    title: "Server-room UPS replacement",
    customerName: "Eastside Library",
    address: "55 East Main",
    region: "east",
    skill: "it",
    priority: "high",
    status: "scheduled",
    technicianId: "tech-3",
    scheduledStart: isoOffset(1, 9),
    scheduledEnd: isoOffset(1, 13),
    estimatedHours: 4,
    createdAt: isoOffset(-2),
    updatedAt: isoOffset(-1),
  },
  {
    id: "fj-6",
    jobNumber: "FS-2026-006",
    title: "Network rewire — meeting rooms",
    customerName: "Quanta Capital",
    address: "8 Harbour St",
    region: "east",
    skill: "it",
    priority: "low",
    status: "scheduled",
    technicianId: "tech-3",
    scheduledStart: isoOffset(4, 9),
    scheduledEnd: isoOffset(5, 17),
    estimatedHours: 12,
    createdAt: isoOffset(-5),
    updatedAt: isoOffset(-1),
  },
  {
    id: "fj-7",
    jobNumber: "FS-2026-007",
    title: "Cabinet retrofit — break room",
    customerName: "Westport Bank",
    address: "1100 West Ave",
    region: "west",
    skill: "carpentry",
    priority: "low",
    status: "scheduled",
    technicianId: "tech-4",
    scheduledStart: isoOffset(2, 9),
    scheduledEnd: isoOffset(3, 16),
    estimatedHours: 10,
    createdAt: isoOffset(-3),
    updatedAt: isoOffset(-1),
  },
  {
    id: "fj-8",
    jobNumber: "FS-2026-008",
    title: "Walk-in freezer compressor swap",
    customerName: "Greenleaf Grocers",
    address: "300 Greenleaf Pl",
    region: "central",
    skill: "hvac",
    priority: "urgent",
    status: "in_progress",
    technicianId: "tech-5",
    scheduledStart: isoOffset(0, 7),
    scheduledEnd: isoOffset(0, 17),
    estimatedHours: 10,
    notes: "Customer reports product loss — keep update cadence at 1h.",
    createdAt: isoOffset(-1),
    updatedAt: isoOffset(0),
  },
  {
    id: "fj-9",
    jobNumber: "FS-2026-009",
    title: "Tankless water heater replacement",
    customerName: "Hilltop Apartments",
    address: "62 Hilltop Crescent",
    region: "central",
    skill: "plumbing",
    priority: "medium",
    status: "scheduled",
    technicianId: "tech-5",
    scheduledStart: isoOffset(3, 9),
    scheduledEnd: isoOffset(3, 15),
    estimatedHours: 6,
    createdAt: isoOffset(-2),
    updatedAt: isoOffset(-1),
  },
  {
    id: "fj-10",
    jobNumber: "FS-2026-010",
    title: "Unassigned: refrigerator install",
    customerName: "Pearl Bakery",
    address: "77 Pearl St",
    region: "west",
    skill: "appliance",
    priority: "low",
    status: "scheduled",
    technicianId: null,
    scheduledStart: isoOffset(5, 9),
    scheduledEnd: isoOffset(5, 13),
    estimatedHours: 4,
    createdAt: isoOffset(-1),
    updatedAt: isoOffset(0),
  },
];

// ─── Store ────────────────────────────────────────────────────────

interface FieldServiceState {
  jobs: FieldJob[];
  technicians: Technician[];
  updateJob: (id: string, patch: Partial<FieldJob>) => void;
  deleteJob: (id: string) => void;
  assignJob: (id: string, technicianId: string | null) => void;
}

function now(): string {
  return new Date().toISOString();
}

export const useFieldServiceStore = create<FieldServiceState>()(
  persist(
    (set) => ({
      jobs: seedOrEmpty(DEMO_FIELD_JOBS),
      technicians: seedOrEmpty(DEMO_TECHNICIANS),

      updateJob: (id, patch) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id ? { ...j, ...patch, updatedAt: now() } : j,
          ),
        })),

      deleteJob: (id) =>
        set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),

      assignJob: (id, technicianId) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === id ? { ...j, technicianId, updatedAt: now() } : j,
          ),
        })),
    }),
    {
      name: "vyne-field-service",
      partialize: (state) => ({ jobs: state.jobs, technicians: state.technicians }),
    },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────

export const useFieldJobs = (): FieldJob[] =>
  useFieldServiceStore((s) => s.jobs);
export const useTechnicians = (): Technician[] =>
  useFieldServiceStore((s) => s.technicians);
