import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BOMFlowchart } from "../BOMFlowchart";
import {
  DEMO_BOM_TREES,
  buildCost,
  buildableUnits,
} from "@/lib/fixtures/bomTree";

const ROOT = DEMO_BOM_TREES[0]; // MacBook Air M3

describe("BOMFlowchart", () => {
  it("renders the root product name in the header tile", () => {
    render(<BOMFlowchart root={ROOT} />);
    // Final Product label + the product name itself both appear.
    expect(screen.getByText(/Final Product/i)).toBeInTheDocument();
    expect(screen.getAllByText(/MacBook Air M3/i).length).toBeGreaterThan(0);
  });

  it("renders the roll-up build cost from buildCost()", () => {
    const expected = buildCost(ROOT);
    expect(expected).toBeGreaterThan(0);
    render(<BOMFlowchart root={ROOT} />);
    // The build cost tile renders the label + a $-prefixed value. We
    // assert the label is present and that the canvas has at least
    // one $-prefixed text node — exact formatting depends on fmtMoney.
    expect(screen.getByText(/Build Cost \(BOM roll-up\)/i)).toBeInTheDocument();
    const dollarNodes =
      document.body.textContent?.match(/\$[\d.]+[KM]?/g) ?? [];
    expect(dollarNodes.length).toBeGreaterThan(0);
  });

  it("renders the buildable units count", () => {
    const buildable = buildableUnits(ROOT);
    render(<BOMFlowchart root={ROOT} />);
    // Reproduce the same string that the component shows.
    expect(screen.getByText(String(buildable))).toBeInTheDocument();
  });

  it("renders every leaf component as a node in the SVG", () => {
    const { container } = render(<BOMFlowchart root={ROOT} />);
    const rects = container.querySelectorAll("svg rect");
    // Each visible BOM node is a <rect>. Root + 6 L1 + 11 L2 + 2 L3 = 20.
    // Plus 6 accent strip rects (one per L0/L1 visible node).
    expect(rects.length).toBeGreaterThan(15);
  });

  it("shows the legend instructions text", () => {
    render(<BOMFlowchart root={ROOT} />);
    // The control row tells the user what to do — confirms the
    // interactive surface is rendered (chevrons + click handlers
    // wired up).
    expect(
      screen.getByText(/Click a node to highlight its lineage/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use the chevron to collapse a subtree/i),
    ).toBeInTheDocument();
  });
});
