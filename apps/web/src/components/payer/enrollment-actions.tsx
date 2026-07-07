'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Phone, Mail, LogOut, Loader2, UserRound, Copy, Check } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface Props {
  enrollmentId: string
  collectionName: string
  status: string // 'active' | 'exit_pending' | 'exited' | 'removed'
  exitDueAt: string | null
  exitRequestedBy: string | null
  owner: { name: string; email: string; phone: string }
}

// Payer-side sidebar block: Contact Owner (modal with the owner's registered
// email + phone) and the exit flow (request / revoke with the 7-day grace
// countdown, per PRD 5.9).
export function EnrollmentActions({ enrollmentId, collectionName, status, exitDueAt, exitRequestedBy, owner }: Props) {
  const router = useRouter()
  const { addToast } = useToast()
  const [contactOpen, setContactOpen] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const daysLeft = exitDueAt
    ? Math.max(0, Math.ceil((new Date(exitDueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  async function copy(kind: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1800)
  }

  async function post(path: string, successTitle: string, successBody: string) {
    setBusy(true)
    setError(null)
    const res = await fetch(path, { method: 'POST' })
    setBusy(false)

    if (!res.ok) {
      const { error: msg } = (await res.json().catch(() => ({ error: null }))) as { error: string | null }
      setError(msg ?? 'Something went wrong. Please try again.')
      return false
    }
    addToast(successTitle, successBody)
    setConfirmExit(false)
    router.refresh()
    return true
  }

  return (
    <div className="grid gap-4">
      {/* Contact owner */}
      <button
        type="button"
        onClick={() => setContactOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-border bg-card text-[14px] font-bold text-navy transition-all hover:scale-[1.01] hover:shadow-card active:scale-[0.98]"
      >
        <Phone size={16} />
        Contact owner
      </button>

      {/* Exit flow */}
      {status === 'active' && !confirmExit && (
        <button
          type="button"
          onClick={() => {
            setError(null)
            setConfirmExit(true)
          }}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[13px] text-[13px] font-bold text-red-text transition-colors hover:bg-red/[0.06]"
        >
          <LogOut size={15} />
          Request to exit this collection
        </button>
      )}

      {status === 'active' && confirmExit && (
        <div className="animate-float-up rounded-[13px] border border-red/30 bg-red/[0.05] p-4">
          <p className="mb-3 text-[13px] leading-snug text-text-2">
            Request to leave <span className="font-bold">{collectionName}</span>? The owner is notified and the exit
            finalizes automatically in <span className="font-bold">7 days</span> unless you revoke it.
          </p>
          {error && <p className="mb-3 rounded-lg bg-red/10 px-3 py-2 text-[12.5px] text-red-text">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmExit(false)}
              className="h-10 flex-1 rounded-[11px] border-[1.5px] border-border bg-card text-[13px] font-bold text-text-2"
            >
              Never mind
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                post(
                  `/api/enrollments/${enrollmentId}/exit`,
                  'Exit requested',
                  'The owner has been notified. You can revoke within 7 days.'
                )
              }
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[11px] bg-red text-[13px] font-extrabold text-white disabled:opacity-60"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Request exit
            </button>
          </div>
        </div>
      )}

      {status === 'exit_pending' && (
        <div className="rounded-[13px] border border-amber/40 bg-amber/[0.07] p-4">
          <p className="mb-1 text-[13.5px] font-extrabold text-amber-text">
            {exitRequestedBy === 'owner' ? 'Removal in progress' : 'Exit in progress'}
          </p>
          <p className="mb-3 text-[12.5px] leading-snug text-text-2">
            {exitRequestedBy === 'owner'
              ? 'The owner initiated your removal from this collection. '
              : 'You requested to leave this collection. '}
            It finalizes in <span className="font-bold">{daysLeft} day{daysLeft === 1 ? '' : 's'}</span> unless revoked.
          </p>
          {error && <p className="mb-3 rounded-lg bg-red/10 px-3 py-2 text-[12.5px] text-red-text">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              post(
                `/api/enrollments/${enrollmentId}/exit/revoke`,
                'Exit revoked',
                'You remain an active payer in this collection.'
              )
            }
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[11px] bg-navy text-[13px] font-extrabold text-white disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Revoke {exitRequestedBy === 'owner' ? 'removal' : 'exit request'}
          </button>
        </div>
      )}

      {(status === 'exited' || status === 'removed') && (
        <div className="rounded-[13px] bg-fill p-4 text-[12.5px] leading-snug text-text-muted">
          You are no longer an active payer in this collection. Your payment history remains on record.
        </div>
      )}

      {/* Contact owner modal */}
      {contactOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-[3px]" onClick={() => setContactOpen(false)} />
          <div className="animate-pop-in relative w-full max-w-[360px] rounded-[22px] bg-card p-6 shadow-[0_32px_90px_rgba(15,28,63,0.45)]">
            <button
              type="button"
              onClick={() => setContactOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-[9px] text-text-muted transition-colors hover:bg-fill"
            >
              <X size={17} />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-[15px] font-bold text-green">
                <UserRound size={20} />
              </span>
              <div>
                <div className="text-[15.5px] font-extrabold">{owner.name}</div>
                <div className="text-[12px] text-text-muted">Owner of {collectionName}</div>
              </div>
            </div>

            <div className="grid gap-2.5">
              <ContactRow
                icon={<Mail size={16} className="text-text-2" />}
                label="Email"
                value={owner.email}
                copied={copied === 'email'}
                onCopy={() => copy('email', owner.email)}
              />
              <ContactRow
                icon={<Phone size={16} className="text-text-2" />}
                label="Phone"
                value={owner.phone}
                copied={copied === 'phone'}
                onCopy={() => copy('phone', owner.phone)}
              />
            </div>

            <p className="mt-4 text-center text-[11.5px] leading-snug text-text-faint">
              These are the contact details the owner registered on Paybook.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ContactRow({
  icon,
  label,
  value,
  copied,
  onCopy,
}: {
  icon: React.ReactNode
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-[13px] bg-surface px-4 py-3.5">
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-text-muted">{label}</div>
        <div className="truncate text-[13.5px] font-bold">{value}</div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label.toLowerCase()}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-text-muted transition-colors hover:bg-fill-2"
      >
        {copied ? <Check size={15} className="text-green-text-2" /> : <Copy size={14} />}
      </button>
    </div>
  )
}
