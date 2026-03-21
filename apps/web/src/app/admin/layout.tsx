import Link from 'next/link'

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ minHeight: '100vh', background: '#0F0F1A', display: 'flex', flexDirection: 'column' }}>
      {/* Header bar */}
      <header
        style={{
          height: 52,
          background: '#13131F',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 16,
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="21" r="12" fill="#6C47FF" opacity="0.15" />
            <line x1="6" y1="8" x2="18" y2="28" stroke="#8B68FF" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="30" y1="8" x2="18" y2="28" stroke="#6C47FF" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="6" cy="8" r="3.3" fill="#8B68FF" />
            <circle cx="30" cy="8" r="3.3" fill="#8B68FF" />
            <circle cx="18" cy="28" r="5.2" fill="#6C47FF" />
            <circle cx="18" cy="28" r="2" fill="white" opacity="0.65" />
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#E8E8F8', letterSpacing: '-0.02em' }}>VYNE Admin</span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: '#6C47FF',
              background: 'rgba(108,71,255,0.18)',
              padding: '2px 7px',
              borderRadius: 4,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            INTERNAL
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Back link */}
        <Link
          href="/home"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: '#9090B0',
            textDecoration: 'none',
            padding: '5px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'color 0.15s',
          }}
        >
          <span style={{ fontSize: 14 }}>&#8592;</span> Back to App
        </Link>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
