'use client'

import { useState, type ReactNode } from 'react'
import { Landmark, HandCoins } from 'lucide-react'

// Unified dashboard: one account, two perspectives. No stored "role" — the
// tabs simply reflect relationships (Collections you own vs ones you're in).
export function DashboardTabs({
  ownedCount,
  joinedCount,
  ownedPanel,
  joinedPanel,
}: {
  ownedCount: number
  joinedCount: number
  ownedPanel: ReactNode
  joinedPanel: ReactNode
}) {
  // Land people where their activity is: owners see owned, pure payers see joined.
  const [tab, setTab] = useState<'owned' | 'joined'>(ownedCount === 0 && joinedCount > 0 ? 'joined' : 'owned')

  const tabs = [
    { id: 'owned' as const, label: 'My Collections', icon: Landmark, count: ownedCount },
    { id: 'joined' as const, label: "Collections I'm in", icon: HandCoins, count: joinedCount },
  ]

  return (
    <div>
      <div className="mb-6 flex w-fit gap-1 rounded-[14px] border border-border bg-card p-1 shadow-card">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                active
                  ? 'flex items-center gap-2 rounded-[11px] bg-navy px-4 py-2.5 text-[13.5px] font-bold text-white shadow-[0_4px_12px_rgba(15,28,63,0.25)] transition-all'
                  : 'flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[13.5px] font-semibold text-text-muted transition-all hover:bg-fill'
              }
            >
              <Icon size={16} strokeWidth={2} className={active ? 'text-green' : undefined} />
              {t.label}
              <span
                className={
                  active
                    ? 'rounded-pill bg-green px-1.5 py-0.5 text-[11px] font-extrabold text-navy'
                    : 'rounded-pill bg-fill-2 px-1.5 py-0.5 text-[11px] font-bold text-text-muted'
                }
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      <div key={tab} className="animate-route-in">
        {tab === 'owned' ? ownedPanel : joinedPanel}
      </div>
    </div>
  )
}
