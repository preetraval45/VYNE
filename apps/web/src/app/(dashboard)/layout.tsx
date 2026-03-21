import { Sidebar } from '@/components/layout/Sidebar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8F8FC' }}>
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className="flex-1 overflow-auto content-scroll"
        style={{ background: '#FFFFFF' }}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  )
}
