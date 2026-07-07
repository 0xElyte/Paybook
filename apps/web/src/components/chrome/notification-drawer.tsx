'use client'

import { useEffect, useState } from 'react'
import { X, Bell, Banknote, Megaphone, UserPlus2, CalendarClock, LogOut } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function iconFor(type: string) {
  switch (type) {
    case 'announcement':
      return <Megaphone size={17} className="text-blue-text" />
    case 'payer_joined':
      return <UserPlus2 size={17} className="text-green-text-2" />
    case 'payment_due':
    case 'payment_overdue':
      return <CalendarClock size={17} className="text-amber-text" />
    case 'exit_request':
    case 'exit_revoked':
    case 'exit_finalized':
      return <LogOut size={17} className="text-red-text" />
    default:
      return <Banknote size={17} className="text-green-text-2" />
  }
}

export function NotificationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[] | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    void (async () => {
      const res = await fetch('/api/notifications')
      if (!res.ok || cancelled) return
      const data = (await res.json()) as { notifications: Notification[] }
      if (!cancelled) setNotifications(data.notifications)
      // Opening the drawer clears the unread badge, like most inboxes.
      void fetch('/api/notifications', { method: 'PATCH' })
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-navy/[0.28] backdrop-blur-[3px]"
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-drawer-in absolute top-0 right-0 flex h-full w-full max-w-[92vw] flex-col bg-card shadow-[-20px_0_60px_rgba(15,28,63,0.2)] sm:w-[400px]"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-[22px]">
          <h3 className="text-lg font-extrabold">Notifications</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="grid h-[34px] w-[34px] place-items-center rounded-[9px] text-text-muted transition-colors hover:bg-fill"
          >
            <X size={18} />
          </button>
        </div>

        {notifications === null ? (
          <div className="grid flex-1 place-items-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-fill-2 border-t-green" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-fill">
              <Bell size={24} className="text-text-muted" />
            </div>
            <p className="text-sm font-semibold text-text">No notifications yet</p>
            <p className="max-w-[24ch] text-xs text-text-muted">
              You&apos;ll see payment confirmations and updates here as they happen.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`mb-1 flex gap-3 rounded-[13px] px-3.5 py-3.5 ${n.readAt ? '' : 'bg-green/[0.06]'}`}
              >
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fill">
                  {iconFor(n.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13.5px] leading-snug font-bold">{n.title}</span>
                    {!n.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-green" />}
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug break-words whitespace-pre-wrap text-text-muted">
                    {n.body}
                  </p>
                  <span className="mt-1 block text-[11px] text-text-faint">{timeAgo(n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
