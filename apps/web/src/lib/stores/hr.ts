"use client";

// PH-A R4 — HR Zustand store. Replaces the fixtures-only import in
// the HR page so employee + leave-request data follows the user across
// devices via /api/hr/{employees,leave-requests}.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  EMPLOYEES as DEMO_EMPLOYEES,
  INITIAL_LEAVE_REQUESTS as DEMO_LEAVE_REQUESTS,
  type Employee,
  type LeaveRequest,
} from "@/lib/fixtures/hr";
import { seedOrEmpty, shouldSeedFixtures } from "@/lib/stores/seedMode";

type HrResource = "employees" | "leave-requests";

function mirror(
  method: "POST" | "PATCH" | "DELETE",
  resource: HrResource,
  id?: string,
  body?: unknown,
) {
  const url = id
    ? `/api/hr/${resource}/${encodeURIComponent(id)}`
    : `/api/hr/${resource}`;
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  void fetch(url, init).catch(() => {});
}

interface HRStore {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  hydrated: boolean;

  setEmployees: (rows: Employee[]) => void;
  addEmployee: (e: Employee) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  setLeaveRequests: (rows: LeaveRequest[]) => void;
  addLeaveRequest: (l: LeaveRequest) => void;
  updateLeaveRequest: (id: string, patch: Partial<LeaveRequest>) => void;
  deleteLeaveRequest: (id: string) => void;

  hydrateFromServer: () => Promise<void>;
}

export const useHRStore = create<HRStore>()(
  persist(
    (set, get) => ({
      employees: seedOrEmpty(DEMO_EMPLOYEES),
      leaveRequests: seedOrEmpty(DEMO_LEAVE_REQUESTS),
      hydrated: false,

      setEmployees: (rows) => set({ employees: rows }),
      addEmployee: (e) => {
        set((s) => ({ employees: [e, ...s.employees] }));
        mirror("POST", "employees", undefined, e);
      },
      updateEmployee: (id, patch) => {
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        }));
        mirror("PATCH", "employees", id, patch);
      },
      deleteEmployee: (id) => {
        set((s) => ({ employees: s.employees.filter((e) => e.id !== id) }));
        mirror("DELETE", "employees", id);
      },

      setLeaveRequests: (rows) => set({ leaveRequests: rows }),
      addLeaveRequest: (l) => {
        set((s) => ({ leaveRequests: [l, ...s.leaveRequests] }));
        mirror("POST", "leave-requests", undefined, l);
      },
      updateLeaveRequest: (id, patch) => {
        set((s) => ({
          leaveRequests: s.leaveRequests.map((l) =>
            l.id === id ? { ...l, ...patch } : l,
          ),
        }));
        mirror("PATCH", "leave-requests", id, patch);
      },
      deleteLeaveRequest: (id) => {
        set((s) => ({
          leaveRequests: s.leaveRequests.filter((l) => l.id !== id),
        }));
        mirror("DELETE", "leave-requests", id);
      },

      hydrateFromServer: async () => {
        try {
          const [empRes, leaveRes] = await Promise.all([
            fetch("/api/hr/employees", { cache: "no-store" }),
            fetch("/api/hr/leave-requests", { cache: "no-store" }),
          ]);
          if (empRes.ok) {
            const body = (await empRes.json()) as { employees?: Employee[] };
            if (Array.isArray(body.employees) && body.employees.length > 0) {
              set({ employees: body.employees, hydrated: true });
            } else if (Array.isArray(body.employees)) {
              if (shouldSeedFixtures()) {
                set({ employees: DEMO_EMPLOYEES, hydrated: true });
              } else {
                set({ employees: [], hydrated: true });
              }
            }
          }
          if (leaveRes.ok) {
            const body = (await leaveRes.json()) as {
              "leave-requests"?: LeaveRequest[];
            };
            const rows = body["leave-requests"];
            if (Array.isArray(rows) && rows.length > 0) {
              set({ leaveRequests: rows });
            } else if (Array.isArray(rows)) {
              if (shouldSeedFixtures()) {
                set({ leaveRequests: DEMO_LEAVE_REQUESTS });
              } else {
                set({ leaveRequests: [] });
              }
            }
          }
        } catch {
          if (!get().hydrated) set({ hydrated: false });
        }
      },
    }),
    { name: "vyne-hr" },
  ),
);
