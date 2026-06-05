import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectsDashboardView } from "../ProjectsDashboardView";

// Lightweight smoke test — confirms the dashboard renders without
// throwing when the underlying stores return their default seeded data.
// Catches the most common regression class: a chart primitive throwing
// on a zero-length dataset.

// Mock the realtime + dashboard layout's effects which would try to
// fetch on mount. The store hooks themselves are real — they use the
// fixtures via `seedOrEmpty` in test mode.

describe("ProjectsDashboardView smoke", () => {
  it("renders the hero banner + at least one KPI tile without throwing", () => {
    // Silence the framer-motion / Pusher warnings that bubble through.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ProjectsDashboardView />);
    expect(screen.getByText(/Portfolio live/i)).toBeInTheDocument();
    // The 8-tile KPI strip exposes labels; assert the first one renders.
    expect(screen.getByText(/Total Projects/i)).toBeInTheDocument();
    errSpy.mockRestore();
  });

  it("renders the 'Portfolio Gantt' card", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ProjectsDashboardView />);
    expect(screen.getByText(/Portfolio Gantt/i)).toBeInTheDocument();
    errSpy.mockRestore();
  });

  it("renders 'Project Weather' card", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ProjectsDashboardView />);
    expect(screen.getByText(/Project Weather/i)).toBeInTheDocument();
    errSpy.mockRestore();
  });
});
