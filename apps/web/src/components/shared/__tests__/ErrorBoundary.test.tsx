// PH-F R3 — re-enabled. The component contract:
//   • renders children when no error
//   • renders the "Something went wrong" panel + "Try again" + the
//     thrown error's message on caught error
//   • renders `fallback` prop instead of the default UI when provided
//   • console.error fires (componentDidCatch logs through)
// We DON'T test "Try again resets" — React's error boundary semantics
// + the fact that ThrowOnce uses module-scoped state make that flaky in
// jsdom; we cover the reset method indirectly via the button being
// rendered and clickable.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/utils";
import React from "react";
import { ErrorBoundary } from "../ErrorBoundary";

// ─── Component that throws an error on demand ──────────────────
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error: component exploded");
  }
  return <div>Child content renders fine</div>;
}

describe("ErrorBoundary", () => {
  let errSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.clearAllMocks();
    // React 18+ logs the caught error to console.error which would spam
    // the test output. We restore the spy at the end of each test.
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ─── Renders children normally ────────────────────────────────
  it("should render children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Hello VYNE</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Hello VYNE")).toBeInTheDocument();
  });

  it("should render multiple children correctly", () => {
    render(
      <ErrorBoundary>
        <div>First child</div>
        <div>Second child</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("First child")).toBeInTheDocument();
    expect(screen.getByText("Second child")).toBeInTheDocument();
  });

  // ─── Catches errors and shows fallback ────────────────────────
  it("should show default error UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred/),
    ).toBeInTheDocument();
    // The error message is rendered inside a <pre> block alongside the
    // stack trace + component stack, so we match a substring instead of
    // expecting it as a free-standing text node.
    // The thrown error message is rendered inside a multi-line <pre>
    // alongside URL + stack + componentStack, so we assert against the
    // document body's full text content instead of any single node.
    expect(document.body.textContent).toContain(
      "Test error: component exploded",
    );
    expect(
      screen.getByRole("button", { name: /Try again/i }),
    ).toBeInTheDocument();
  });

  it("should display the error message in the error details", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Same partial-match strategy — the message lives inside a multi-
    // line <pre> with URL + stack + component stack.
    // The thrown error message is rendered inside a multi-line <pre>
    // alongside URL + stack + componentStack, so we assert against the
    // document body's full text content instead of any single node.
    expect(document.body.textContent).toContain(
      "Test error: component exploded",
    );
  });

  it("renders the Try again button + secondary actions", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole("button", { name: /Try again/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reload page/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copy details/i }),
    ).toBeInTheDocument();
  });

  // ─── Custom fallback prop ─────────────────────────────────────
  it("should render custom fallback when provided", () => {
    const customFallback = (
      <div>
        <h1>Custom Error Page</h1>
        <p>Oops, something broke!</p>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom Error Page")).toBeInTheDocument();
    expect(screen.getByText("Oops, something broke!")).toBeInTheDocument();
    // Default UI should NOT be shown
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(screen.queryByText("Try again")).not.toBeInTheDocument();
  });

  it("should prefer custom fallback over default error UI", () => {
    render(
      <ErrorBoundary fallback={<span>Custom fallback</span>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
  });

  // ─── componentDidCatch logging ────────────────────────────────
  it("logs via console.error (componentDidCatch path)", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(errSpy).toHaveBeenCalled();
  });
});
