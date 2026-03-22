import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/utils";
import { ErrorBoundary } from "../ErrorBoundary";

// ─── Component that throws an error on demand ──────────────────
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error: component exploded");
  }
  return <div>Child content renders fine</div>;
}

// ─── A stateful wrapper to toggle errors on and off ─────────────
function ErrorToggle() {
  const [shouldThrow, setShouldThrow] = React.useState(false);
  return (
    <div>
      <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </div>
  );
}

import React from "react";

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(
      screen.getByText("Test error: component exploded"),
    ).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("should display the error message in the error details", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(
      screen.getByText("Test error: component exploded"),
    ).toBeInTheDocument();
  });

  // ─── "Try again" button resets the boundary ───────────────────
  it('should reset the boundary and re-render children when "Try again" is clicked', () => {
    // We need a component that can stop throwing after the first error
    let throwCount = 0;
    function ThrowOnce() {
      throwCount++;
      if (throwCount === 1) {
        throw new Error("First render error");
      }
      return <div>Recovered successfully</div>;
    }

    render(
      <ErrorBoundary>
        <ThrowOnce />
      </ErrorBoundary>,
    );

    // Error state should be shown
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Click "Try again"
    fireEvent.click(screen.getByText("Try again"));

    // After reset, the component re-renders without throwing
    expect(screen.getByText("Recovered successfully")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
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
  it("should call console.error with error details", () => {
    // Temporarily capture console.error calls
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // React and the ErrorBoundary both call console.error
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
