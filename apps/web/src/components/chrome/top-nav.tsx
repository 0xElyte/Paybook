'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Bell } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { NotificationDrawer } from './notification-drawer'

const ownerLinks = [{ href: '/dashboard', label: 'Dashboard' }]

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function TopNav({
  variant,
  userName,
  activeHref,
}: {
  variant: 'owner' | 'payer'
  userName: string
  activeHref?: string
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Unread badge: fetch on mount, refresh every 30s, clear when the drawer
  // opens (the drawer marks everything read server-side).
  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch('/api/notifications').catch(() => null)
      if (!res?.ok || cancelled) return
      const data = (await res.json()) as { unreadCount: number }
      if (!cancelled) setUnreadCount(data.unreadCount)
    }
    void load()
    const interval = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      <div className="sticky top-0 z-40 flex h-[66px] items-center gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-[10px] sm:gap-7 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/paybook-mark.png" alt="Paybook" width={32} height={32} />
          <span className="text-lg font-extrabold tracking-tight text-text">Paybook</span>
        </Link>

        {/* Roles were scrapped — one unified nav for everyone. `variant` is kept
            only so existing call sites don't all need touching. */}
        {(variant === 'owner' || variant === 'payer') && (
          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {ownerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={
                  activeHref === link.href
                    ? 'rounded-[9px] bg-fill px-3.5 py-2 text-sm font-bold text-navy'
                    : 'rounded-[9px] px-3.5 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-surface'
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => {
              setDrawerOpen(true)
              setUnreadCount(0)
            }}
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-[11px] text-text-2 transition-colors hover:bg-fill"
          >
            <Bell size={21} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 grid h-[17px] min-w-[17px] place-items-center rounded-pill bg-green px-1 text-[10px] font-extrabold text-navy">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-[11px] pl-1.5 pr-2 py-1 transition-colors hover:bg-fill"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-navy text-sm font-bold text-green">
                {initials(userName)}
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-[13.5px] font-bold">{userName}</div>
              </div>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="animate-float-up absolute right-0 top-[calc(100%+8px)] z-50 w-40 rounded-2xl border border-border bg-card p-1.5 shadow-[0_18px_50px_rgba(15,28,63,0.18)]">
                  <button
                    type="button"
                    onClick={() => signOut({ redirectTo: '/login' })}
                    className="w-full rounded-[9px] px-3 py-2 text-left text-[13.5px] font-semibold text-text-2 transition-colors hover:bg-fill"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}
