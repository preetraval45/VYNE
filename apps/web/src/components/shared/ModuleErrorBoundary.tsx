'use client'

import React from 'react'
import ErrorBoundary from './ErrorBoundary'

interface ModuleErrorBoundaryProps {
  readonly children: React.ReactNode
  readonly moduleName: string
}

function ModuleErrorFallback({ moduleName, onReset }: Readonly<{ moduleName: string; onReset: () => void }>) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[320px] px-8 py-12"
      style={{ background: 'var(--content-bg)' }}
    >
      {/* Error icon */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'rgba(108, 71, 255, 0.08)' }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--vyne-purple)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <h2
        className="text-lg font-semibold mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        The {moduleName} module encountered an error
      </h2>

      <p
        className="text-sm mb-6 text-center max-w-md"
        style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}
      >
        Something went wrong while loading {moduleName}. This has been logged
        automatically. You can try reloading the module below.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-fast"
          style={{
            background: 'var(--vyne-purple)',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--vyne-purple-light)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--vyne-purple)'
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Reload {moduleName}
        </button>

        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-fast"
          style={{
            background: 'var(--content-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--content-border)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--vyne-purple)'
            e.currentTarget.style.color = 'var(--vyne-purple)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--content-border)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          Refresh page
        </button>
      </div>
    </div>
  )
}

class ModuleErrorBoundary extends React.Component<
  ModuleErrorBoundaryProps,
  { readonly hasError: boolean }
> {
  private readonly boundaryRef = React.createRef<ErrorBoundary>()

  constructor(props: ModuleErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  handleReset = (): void => {
    this.setState({ hasError: false })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <ModuleErrorFallback
          moduleName={this.props.moduleName}
          onReset={this.handleReset}
        />
      )
    }

    return (
      <ErrorBoundary ref={this.boundaryRef}>
        {this.props.children}
      </ErrorBoundary>
    )
  }
}

export { ModuleErrorBoundary }
export default ModuleErrorBoundary
