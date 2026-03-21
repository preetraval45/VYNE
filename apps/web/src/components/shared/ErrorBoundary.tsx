'use client'

import React from 'react'

interface ErrorBoundaryProps {
  readonly children: React.ReactNode
  readonly fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  readonly hasError: boolean
  readonly error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[VYNE ErrorBoundary] Caught error:', error)
    console.error('[VYNE ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    return (
      <div
        className="flex flex-col items-center justify-center min-h-[320px] px-8 py-12"
        style={{ background: 'var(--content-bg)' }}
      >
        {/* Error icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(239, 68, 68, 0.08)' }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--status-danger)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Something went wrong
        </h2>

        <p
          className="text-sm mb-6 text-center max-w-md"
          style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}
        >
          An unexpected error occurred. Please try again or contact support if the
          problem persists.
        </p>

        {/* Error details (dev-friendly) */}
        {this.state.error && (
          <pre
            className="text-xs mb-6 px-4 py-3 rounded-xl max-w-lg w-full overflow-auto"
            style={{
              background: 'var(--content-secondary)',
              border: '1px solid var(--content-border)',
              color: 'var(--text-tertiary)',
            }}
          >
            {this.state.error.message}
          </pre>
        )}

        <button
          onClick={this.handleReset}
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
          Try again
        </button>
      </div>
    )
  }
}

export { ErrorBoundary }
export default ErrorBoundary
