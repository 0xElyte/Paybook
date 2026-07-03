'use client'

import { X, Bell } from 'lucide-react'

export function NotificationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-extrabold">Notifications</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="grid h-[34px] w-[34px] place-items-center rounded-[9px] text-text-muted transition-colors hover:bg-fill"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-fill">
            <Bell size={24} className="text-text-muted" />
          </div>
          <p className="text-sm font-semibold text-text">No notifications yet</p>
          <p className="max-w-[24ch] text-xs text-text-muted">
            You&apos;ll see payment confirmations and updates here as they happen.
          </p>
        </div>
      </div>
    </div>
  )
}
