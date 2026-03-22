import { Sidebar } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SkipToContent } from "@/components/shared/SkipToContent";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#F8F8FC" }}
      aria-label="Dashboard"
    >
      {/* Skip to content link — visible on keyboard focus */}
      <SkipToContent />

      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        id="main-content"
        role="main"
        className="flex-1 overflow-auto content-scroll"
        style={{ background: "#FFFFFF" }}
        tabIndex={-1}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  );
}
