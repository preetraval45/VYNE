'use client'

import { useRouter } from 'next/navigation'

// ── Stat card ────────────────────────────────────────────────────
function StatCard({ label, value, delta, deltaColor }: Readonly<{
  label: string; value: string; delta: string; deltaColor: string
}>) {
  return (
    <div style={{ background: '#F7F7FB', borderRadius: 8, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: '#6B6B8A', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: '#1A1A2E', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, marginTop: 4, color: deltaColor }}>{delta}</div>
    </div>
  )
}

// ── Activity item ─────────────────────────────────────────────────
function ActivityItem({ avatar, name, action, time, avatarBg }: Readonly<{
  avatar: string; name: string; action: string; time: string; avatarBg: string
}>) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: avatarBg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 600, color: '#fff',
      }}>
        {avatar}
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#1A1A2E' }} dangerouslySetInnerHTML={{ __html: action }} />
        <div style={{ fontSize: 10, color: '#A0A0B8', marginTop: 2 }}>{time}</div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{
        height: 44, borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8,
        flexShrink: 0, background: '#fff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="21" r="12" fill="#6C47FF" opacity="0.12" />
            <line x1="6" y1="8" x2="18" y2="28" stroke="#8B68FF" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="30" y1="8" x2="18" y2="28" stroke="#6C47FF" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="6" cy="8" r="3.3" fill="#8B68FF" />
            <circle cx="30" cy="8" r="3.3" fill="#8B68FF" />
            <circle cx="18" cy="28" r="5.2" fill="#6C47FF" />
            <circle cx="18" cy="28" r="2" fill="white" opacity="0.65" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Good morning, Preet 👋</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#A0A0B8' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={() => router.push('/projects')}
            style={{
              background: '#6C47FF', color: '#fff', border: 'none', borderRadius: 8,
              padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
            }}
          >
            + New Issue
          </button>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'linear-gradient(135deg,#6C47FF,#9B59B6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 600, color: '#fff',
          }}>
            PR
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* AI Alert Card */}
        <div style={{
          background: '#EEEDFE', border: '1px solid #AFA9EC', borderRadius: 12,
          padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="21" r="12" fill="#6C47FF" opacity="0.15" />
              <line x1="6" y1="8" x2="18" y2="28" stroke="#8B68FF" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="30" y1="8" x2="18" y2="28" stroke="#6C47FF" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="18" cy="28" r="5.2" fill="#6C47FF" />
              <circle cx="18" cy="28" r="2" fill="white" opacity="0.65" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#3730A3' }}>Vyne AI — Active Incident</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#6C47FF', background: 'rgba(108,71,255,0.12)', padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>LIVE</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: '#7F77DD' }}>2:14 PM · 7 min ago</span>
          </div>
          <p style={{ fontSize: 13, color: '#1E1B4B', lineHeight: 1.65, marginBottom: 12 }}>
            <code style={{ background: 'rgba(108,71,255,0.12)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>api-service v2.4.1</code> deployment failed at 2:14 PM due to a missing IAM permission.{' '}
            <strong>47 orders</strong> are currently stuck in &quot;processing&quot; — estimated revenue at risk:{' '}
            <strong style={{ color: '#991B1B' }}>$12,400</strong>.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={{ background: '#6C47FF', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
              onClick={() => router.push('/observe')}
            >
              🔄 Execute Rollback
            </button>
            <button
              style={{ background: 'transparent', color: '#6B6B8A', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
              onClick={() => router.push('/observe')}
            >
              View Metrics
            </button>
            <button
              style={{ background: 'transparent', color: '#6B6B8A', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
              onClick={() => router.push('/chat')}
            >
              Open #alerts
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          <StatCard label="Active Issues" value="42" delta="↑ 3 this week" deltaColor="#3B82F6" />
          <StatCard label="Messages Today" value="284" delta="↑ 12% vs yesterday" deltaColor="#22C55E" />
          <StatCard label="Open Orders" value="156" delta="4 urgent today" deltaColor="#F59E0B" />
          <StatCard label="System Health" value="4/5" delta="1 service degraded" deltaColor="#EF4444" />
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,280px)', gap: 14 }}>
          {/* Left column */}
          <div>
            {/* Recent Activity */}
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>Recent Activity</span>
                <button style={{ background: 'transparent', border: 'none', fontSize: 11, color: '#6B6B8A', cursor: 'pointer', padding: '4px 10px', borderRadius: 8 }}>View all</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ActivityItem avatar="AI" name="Vyne AI" avatarBg="linear-gradient(135deg,#E24B4A,#C0392B)"
                  action="<strong>Vyne AI</strong> detected incident in <strong>api-service</strong>"
                  time="2 min ago · 47 orders impacted" />
                <ActivityItem avatar="S" name="Sarah K." avatarBg="linear-gradient(135deg,#9B59B6,#8E44AD)"
                  action="<strong>Sarah K.</strong> moved <strong>ENG-43</strong> to In Review"
                  time="15 min ago · Projects" />
                <ActivityItem avatar="T" name="Tony M." avatarBg="linear-gradient(135deg,#E67E22,#F39C12)"
                  action="<strong>Tony M.</strong> deployed <strong>auth-service v1.8.2</strong> ✅"
                  time="1 hour ago · Code" />
                <ActivityItem avatar="AI" name="Vyne AI" avatarBg="linear-gradient(135deg,#6C47FF,#9B59B6)"
                  action="<strong>Vyne AI</strong> flagged <strong>PWR-003</strong> stock critical"
                  time="2 hours ago · Inventory · 38 units left" />
              </div>
            </div>

            {/* Sprint progress */}
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 14 }}>Sprint 12 — Progress</div>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6B6B8A' }}>27 / 35 points complete</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6C47FF' }}>77%</span>
              </div>
              <div style={{ height: 4, background: '#F0F0F8', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: '100%', width: '77%', background: '#6C47FF', borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: '12 Done', bg: '#F0FDF4', color: '#166534' },
                  { label: '4 In Review', bg: '#EFF6FF', color: '#1E40AF' },
                  { label: '4 In Progress', bg: '#FFFBEB', color: '#92400E' },
                  { label: '8 Todo', bg: '#F0F0F8', color: '#6B6B8A' },
                ].map(({ label, bg, color }) => (
                  <span key={label} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: bg, color }}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* My Focus Today */}
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 12 }}>My Focus Today</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { task: 'Fix Secrets Manager IAM permissions', meta: 'ENG-43 · urgent · due today' },
                  { task: 'LangGraph agent orchestration review', meta: 'ENG-45 · high · Sprint 12' },
                  { task: 'TimescaleDB metrics schema migration', meta: 'ENG-41 · medium · in review' },
                ].map(({ task, meta }) => (
                  <div key={task} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <input type="checkbox" style={{ marginTop: 2, accentColor: '#6C47FF', cursor: 'pointer' }} />
                    <div>
                      <div style={{ fontSize: 12, color: '#1A1A2E' }}>{task}</div>
                      <div style={{ fontSize: 10, color: '#A0A0B8', marginTop: 1 }}>{meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ask Vyne AI */}
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 12 }}>Ask Vyne AI</div>
              <div style={{ background: '#F7F7FB', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#A0A0B8', marginBottom: 8 }}>Recent queries</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {["What caused today's incident?", 'Which orders are stuck?', 'Low stock items this week?'].map((q) => (
                    <button key={q} style={{
                      background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8,
                      padding: '6px 10px', fontSize: 11, color: '#6B6B8A', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.1s',
                    }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <button style={{
                width: '100%', background: '#6C47FF', color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>
                ⌘ Ask anything (⌘K)
              </button>
            </div>

            {/* Quick Actions */}
            <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 12 }}>Quick Actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {[
                  { label: '+ New Issue', action: () => router.push('/projects') },
                  { label: '📢 Post Update', action: () => router.push('/chat') },
                  { label: '📦 Add Product', action: () => router.push('/ops') },
                  { label: '📋 New Order', action: () => router.push('/ops') },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action} style={{
                    background: 'transparent', color: '#6B6B8A', border: '1px solid rgba(0,0,0,0.12)',
                    borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
