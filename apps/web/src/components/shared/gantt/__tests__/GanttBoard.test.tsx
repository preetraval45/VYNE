import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GanttBoard, type GanttRow, type GanttDependency } from "../GanttBoard";

const sampleRows: GanttRow[] = [
  {
    id: "t1",
    label: "Design",
    start: "2026-05-10T00:00:00.000Z",
    end: "2026-05-14T00:00:00.000Z",
    progress: 0.5,
    status: "in_progress",
    priority: "high",
  },
  {
    id: "t2",
    label: "Build",
    start: "2026-05-15T00:00:00.000Z",
    end: "2026-05-22T00:00:00.000Z",
    progress: 0.1,
    status: "todo",
    priority: "medium",
  },
  {
    id: "ms",
    label: "Launch",
    start: "2026-05-23T00:00:00.000Z",
    end: "2026-05-23T00:00:00.000Z",
    milestone: true,
    status: "todo",
  },
];

describe("GanttBoard", () => {
  it("renders one bar per non-milestone row + a milestone diamond", () => {
    render(<GanttBoard rows={sampleRows} title="Plan" />);
    expect(screen.getByLabelText("Design bar")).toBeInTheDocument();
    expect(screen.getByLabelText("Build bar")).toBeInTheDocument();
    expect(screen.getByLabelText("Launch milestone")).toBeInTheDocument();
  });

  it("uses the supplied title as section aria-label", () => {
    render(<GanttBoard rows={sampleRows} title="Sprint timeline" />);
    expect(screen.getByLabelText("Sprint timeline")).toBeInTheDocument();
  });

  it("falls back to 'Gantt chart' aria-label when no title", () => {
    render(<GanttBoard rows={sampleRows} />);
    expect(screen.getByLabelText("Gantt chart")).toBeInTheDocument();
  });

  it("renders an empty-state-safe board with no rows", () => {
    render(<GanttBoard rows={[]} title="Empty" />);
    expect(screen.getByLabelText("Empty")).toBeInTheDocument();
  });

  it("renders dependency arrows when dependencies are provided", () => {
    const deps: GanttDependency[] = [{ fromId: "t1", toId: "t2", type: "FS" }];
    const { container } = render(
      <GanttBoard rows={sampleRows} dependencies={deps} title="With deps" />,
    );
    // SVG path is rendered inside the dependency overlay.
    expect(container.querySelector("path[d^='M ']")).toBeTruthy();
  });

  it("fires onRowClick when a row label is clicked", () => {
    const onRowClick = vi.fn();
    render(<GanttBoard rows={sampleRows} onRowClick={onRowClick} />);
    // Exact-string match picks only the left-column label button
    // (the bar has aria-label "Design bar").
    const labelBtn = screen.getByRole("button", { name: "Design" });
    fireEvent.click(labelBtn);
    expect(onRowClick).toHaveBeenCalledWith("t1");
  });

  it("renders group headers when groupBy='status'", () => {
    render(<GanttBoard rows={sampleRows} groupBy="status" />);
    expect(screen.getByLabelText(/Group: In_progress/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Group: Todo/)).toBeInTheDocument();
  });

  it("disables drag affordances when readOnly", () => {
    render(<GanttBoard rows={sampleRows} readOnly />);
    expect(screen.queryByLabelText("Resize start")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Resize end")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Link dependency")).not.toBeInTheDocument();
  });

  it("nudges the bar via keyboard ArrowRight", () => {
    const onReschedule = vi.fn();
    render(
      <GanttBoard
        rows={sampleRows}
        onRescheduleRow={onReschedule}
      />,
    );
    const bar = screen.getByLabelText("Design bar");
    fireEvent.keyDown(bar, { key: "ArrowRight" });
    expect(onReschedule).toHaveBeenCalledTimes(1);
    const [id, start, end] = onReschedule.mock.calls[0];
    expect(id).toBe("t1");
    // Start shifted from 2026-05-10 → 2026-05-11.
    expect(start.slice(0, 10)).toBe("2026-05-11");
    expect(end.slice(0, 10)).toBe("2026-05-15");
  });

  it("resizes the end edge via Shift+ArrowRight", () => {
    const onResize = vi.fn();
    render(<GanttBoard rows={sampleRows} onResizeRow={onResize} />);
    const bar = screen.getByLabelText("Design bar");
    fireEvent.keyDown(bar, { key: "ArrowRight", shiftKey: true });
    expect(onResize).toHaveBeenCalledTimes(1);
    const [id, start, end] = onResize.mock.calls[0];
    expect(id).toBe("t1");
    expect(start.slice(0, 10)).toBe("2026-05-10");
    expect(end.slice(0, 10)).toBe("2026-05-15");
  });

  it("ignores keyboard nudges when readOnly", () => {
    const onReschedule = vi.fn();
    render(
      <GanttBoard
        rows={sampleRows}
        readOnly
        onRescheduleRow={onReschedule}
      />,
    );
    const bar = screen.getByLabelText("Design bar");
    fireEvent.keyDown(bar, { key: "ArrowRight" });
    expect(onReschedule).not.toHaveBeenCalled();
  });

  it("colours bars on the critical path with the danger color", () => {
    const deps: GanttDependency[] = [{ fromId: "t1", toId: "t2", type: "FS" }];
    const { container } = render(
      <GanttBoard rows={sampleRows} dependencies={deps} showCriticalPath />,
    );
    // At least one bar should have the status-danger outline.
    const outlined = container.querySelector(
      '[aria-label="Build bar"][style*="status-danger"], [aria-label="Design bar"][style*="status-danger"]',
    );
    expect(outlined).toBeTruthy();
  });
});
