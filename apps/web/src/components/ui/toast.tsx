'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface Toast {
  id: number
  title: string
  body?: string
}

interface ToastContextValue {
  addToast: (title: string, body?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((title: string, body?: string) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, title, body }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3600)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[120] flex flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-toast-in flex min-w-[280px] items-center gap-3 rounded-[13px] border border-border border-l-4 border-l-green bg-card px-[18px] py-3.5 shadow-[0_14px_40px_rgba(15,28,63,0.16)]"
          >
            <div className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-green/15">
              <CheckCircle2 size={16} className="text-green-text-2" strokeWidth={2.4} />
            </div>
            <div>
              <div className="text-sm font-bold text-text">{t.title}</div>
              {t.body && <div className="text-[13px] text-text-muted">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
