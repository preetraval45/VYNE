# Gantt Chart Implementation Plan

**Reference:** [Odoo ks_gantt_view_project (KSolves)](https://apps.odoo.com/apps/modules/18.0/ks_gantt_view_project)

**Goal:** Bring an Odoo-grade interactive Gantt to VYNE that starts inside a single project, then expands to a global cross-project / cross-domain timeline that field service and maintenance can later adopt with zero rewrite.

---

## What we have today

| Asset | Path | What it does | Gap vs. Odoo ks_gantt |
| --- | --- | --- | --- |
| `GanttChart` | [apps/web/src/components/shared/GanttChart.tsx](apps/web/src/components/shared/GanttChart.tsx) | Read-only bars, week header, today line, progress fill | No drag, no resize, no dependencies, no zoom, no grouping, no inline edit |
| `TaskGanttView` | [apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx:1259](apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx#L1259) | Wraps `GanttChart` for the per-project "Sprint timeline" tab | Read-only, no filters, no group-by |
| `GanttSwimlanes` | [apps/web/src/components/timeline/GanttSwimlanes.tsx](apps/web/src/components/timeline/GanttSwimlanes.tsx) | Lane-grouped event ribbon on the activity timeline | Lanes are sources (GitHub/Sentry/etc.), not tasks |
| `WorkOrderGantt` | [apps/web/src/components/ops/WorkOrderGantt.tsx](apps/web/src/components/ops/WorkOrderGantt.tsx) | Ops work-order schedule | Standalone, no shared engine |
| `criticalPath` | [apps/web/src/lib/reporting/criticalPath.ts](apps/web/src/lib/reporting/criticalPath.ts) | CPM algorithm | Not wired into any Gantt yet |

**Decision:** Build one shared engine (`<GanttBoard />`), replace the three read-only call-sites incrementally. No greenfield duplication.

---

## Scope decision (answers your two questions)

> *Project gantt for within a project, or custom to view all tasks, filtered, etc?*

**Both — same component, different data sources.** The engine takes `rows`, `groups`, `dependencies`, `filters` as props. The per-project page passes the current project's tasks. The new global page passes a filtered query across **all** projects + work orders + field jobs. One render path, two mount points.

> *Project-focused first, field service later?*

Yes. Phase 1–2 ship the engine and per-project view. Phase 3 ships the global / filtered view. Phase 4 (later, opt-in) mounts the same engine in Maintenance and Field Service with their own row adapters.

---

## Phase 1 — Interactive engine (foundation) · ~3 days

Replace `apps/web/src/components/shared/GanttChart.tsx` with a richer `GanttBoard` while keeping the old export name + signature so existing call sites don't break.

**New file:** `apps/web/src/components/shared/gantt/GanttBoard.tsx`

```ts
interface GanttRow {
  id: string;
  parentId?: string;          // for sub-tasks / indentation
  groupId?: string;           // for swimlanes
  label: string;
  start: string;              // ISO
  end: string;                // ISO
  progress?: number;          // 0..1
  color?: string;
  assigneeIds?: string[];
  status?: string;
  priority?: "urgent" | "high" | "medium" | "low";
  milestone?: boolean;        // renders as diamond, not bar
  meta?: string;
  href?: string;              // click-through deep link
}

interface GanttDependency {
  fromId: string;
  toId: string;
  type: "FS" | "SS" | "FF" | "SF";   // finish-to-start, etc.
}

interface GanttBoardProps {
  rows: GanttRow[];
  dependencies?: GanttDependency[];
  groupBy?: "none" | "assignee" | "status" | "priority" | "project" | "custom";
  zoom?: "day" | "week" | "month" | "quarter";
  showCriticalPath?: boolean;
  showWeekends?: boolean;
  readOnly?: boolean;
  onRescheduleRow?: (id: string, start: string, end: string) => void | Promise<void>;
  onResizeRow?: (id: string, start: string, end: string) => void | Promise<void>;
  onLinkDependency?: (from: string, to: string) => void;
  onRowClick?: (id: string) => void;
}
```

**Tasks:**
1. Extract the existing render math (`origin`, `totalDays`, `weekMarkers`) into `apps/web/src/components/shared/gantt/timeline.ts`.
2. Add a **zoom toolbar** (Day / Week / Month / Quarter) — `dayWidth` becomes derived from zoom: 36 / 24 / 8 / 3.
3. **Drag-to-reschedule** — pointer-events on the bar body; calls `onRescheduleRow` via `optimisticAction` helper at [apps/web/src/lib/optimistic.ts](apps/web/src/lib/optimistic.ts) so failures roll back with a toast.
4. **Drag-handle resize** — 6 px handles on each bar edge; same optimistic path.
5. **Dependency arrows** — SVG overlay rendered on top of the timeline grid; right-edge handle on a bar → drag to another bar's left edge → `onLinkDependency`.
6. **Milestone diamonds** — replace the bar render branch when `milestone === true`.
7. **Today line + working-hours shading** — keep today line, add weekend shading toggle.
8. **Keyboard reachable** — bar focusable, `←/→` shifts by 1 zoom unit, `Shift+←/→` resizes.
9. **Mobile** — at ≤640 px the left label column collapses to 120 px; horizontal scroll already works.
10. Back-compat shim: keep `GanttChart` exporting a `GanttBoardReadOnly` wrapper so callers don't have to migrate at once.

**Tests:**
- `apps/web/src/components/shared/gantt/__tests__/timeline.test.ts` — date math, zoom width derivation.
- `apps/web/src/components/shared/gantt/__tests__/GanttBoard.test.tsx` — render, drag-reschedule fires callback with new dates.

---

## Phase 2 — Per-project view: real interactivity · ~1.5 days

Upgrade [TaskGanttView](apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx#L1259) to use `GanttBoard`.

**Tasks:**
1. Replace the read-only `TaskGanttView` body with `<GanttBoard rows={…} groupBy={groupBy} zoom={zoom} … />`.
2. Add a sub-toolbar above the timeline:
   - Zoom segmented control (Day / Week / Month / Quarter).
   - Group-by dropdown (None / Assignee / Status / Priority / Sprint).
   - "Show weekends" + "Show critical path" toggles.
3. Wire `onRescheduleRow` and `onResizeRow` to `useProjectsStore.updateTask({ startDate, dueDate })` — already mirrored to `/api/tasks/:id` via the existing wire helpers at [apps/web/src/lib/stores/projects.ts:87](apps/web/src/lib/stores/projects.ts#L87).
4. Hook dependency edges to a new `taskDependencies` field on `Task` (additive, optional). Store action `linkDependency(fromId, toId, type)`. Persist with a thin `task_dependencies` table — Prisma migration in [apps/web/prisma/schema.prisma](apps/web/prisma/schema.prisma).
5. Sub-task rows render with 16 px indent under their parent task using `parentId`.
6. Use `criticalPath` from [apps/web/src/lib/reporting/criticalPath.ts](apps/web/src/lib/reporting/criticalPath.ts) when `showCriticalPath` is on — bar `color` overridden to `var(--status-danger)`.
7. Persist user's zoom + group-by preference in `localStorage` keyed by `vyne-gantt-pref:project:<projectId>`.

---

## Phase 3 — Global "All Tasks" Gantt page · ~1.5 days

Answer to your "do we use project gantt for within a project, but custom to view all tasks filtered" question — yes, a new top-level page hosts the same engine with a richer filter rail.

**New route:** `apps/web/src/app/(dashboard)/projects/timeline/page.tsx`
**Sidebar entry:** "Projects → Timeline" sub-nav item in [apps/web/src/components/projects/ProjectsSubNav.tsx](apps/web/src/components/projects/ProjectsSubNav.tsx).

**Tasks:**
1. Pull tasks from **all** projects via `useProjectsStore` (already in memory, no extra fetch).
2. Filter rail (uses existing `useSavedViews` so users can name/pin filters):
   - Project (multi-select)
   - Assignee (multi-select)
   - Status / Priority / Tag
   - Date window (next 7 / 30 / 90 days / custom)
   - "Only my tasks", "Only overdue", "Only milestones"
3. `groupBy` default = `project`; each project is a collapsible swimlane.
4. Bulk actions strip when rows are selected (Shift+click range select, same `useBulkSelection` hook used elsewhere): reassign, change due date, bulk delete.
5. Cmd+K commands: "Open timeline", "Group by assignee", "Zoom to month".
6. AI bar: `<AskAiButton noun="timeline" suggestions={["What's at risk this week?", "Who is over-allocated?", "Reschedule slipped tasks"]} />` — uses the existing `useAiSuggestedPrompts` slot.
7. Saved-views audit-grade export (uses the same `audit={{noun, viewName, filters}}` pattern).

---

## Phase 4 — Reuse in Maintenance + Field Service (opt-in, ~1 day each)

Same engine, different row adapter. **No changes to `GanttBoard`.**

**Maintenance** ([apps/web/src/app/(dashboard)/maintenance/page.tsx](apps/web/src/app/(dashboard)/maintenance/page.tsx)):
- Adapter maps `MaintenanceTicket` → `GanttRow` where `start = scheduledAt`, `end = scheduledAt + estimatedHours`, `color` by SLA bucket, `milestone = true` when it's a PM (preventive) due-date marker.
- `groupBy = "asset"` (asset becomes the swimlane).

**Field Service** (we don't have a route yet — add when the page exists or fold into Maintenance):
- Adapter maps `FieldJob` → `GanttRow` where `groupId = technicianId`. Swimlane per technician.
- Drag-reschedule writes back to job's `scheduledStart` / `scheduledEnd`.
- This is where your "customization on the other would be great" lives — extra filters for region / skill, but the rendering is unchanged.

---

## Data model deltas

Add to [packages/shared-types/entities.ts](packages/shared-types/entities.ts):

```ts
export interface TaskDependency {
  id: string;
  fromTaskId: string;
  toTaskId: string;
  type: "FS" | "SS" | "FF" | "SF";
  lagDays?: number;
  createdAt: string;
}
```

Add to [apps/web/prisma/schema.prisma](apps/web/prisma/schema.prisma):

```prisma
model TaskDependency {
  id          String   @id @default(cuid())
  fromTaskId  String
  toTaskId    String
  type        String   // FS | SS | FF | SF
  lagDays     Int?     @default(0)
  createdAt   DateTime @default(now())
  @@unique([fromTaskId, toTaskId])
  @@index([fromTaskId])
  @@index([toTaskId])
}
```

API surface:
- `POST /api/tasks/:id/dependencies` — body `{ toTaskId, type }`
- `DELETE /api/tasks/dependencies/:id`
- Existing `PATCH /api/tasks/:id` already accepts `startDate` / `dueDate` updates — no change.

---

## Out of scope (deliberately)

- Resource-leveling / auto-allocation (Phase 5+).
- Baselines + variance reporting (Phase 5+).
- Print-to-PDF export of the Gantt (use the existing browser print path for now).
- Multi-user concurrent drag with conflict resolution — the `PresenceBubbles` component already shows who's looking, but optimistic-last-write-wins is acceptable for v1.

---

## Suggested ordering

| # | Phase | Days | Ships value when… |
| --- | --- | --- | --- |
| 1 | Interactive engine | 3 | (engine landed, no UI surface yet) |
| 2 | Per-project view rewrites | 1.5 | Users can drag-reschedule inside a project |
| 3 | Global "All Tasks" timeline page | 1.5 | Cross-project planning view exists |
| 4a | Maintenance adapter | 1 | Asset-grouped maintenance Gantt |
| 4b | Field Service adapter | 1 | Tech-grouped job Gantt |

Total: ~8 days to fully match + exceed the Odoo module's surface area, with the per-project win shippable in ~4.5 days.
