'use client'

import { useState } from 'react'
import { X, Phone, Mail, UserRound, Copy, Check } from 'lucide-react'

// Shared "contact card" modal: a person's registered Paybook email + phone
// with one-tap copy. Used by payers (Contact owner) and owners (Contact payer).
export function ContactModal({
  open,
  onClose,
  name,
  subtitle,
  email,
  phone,
}: {
  open: boolean
  onClose: () => void
  name: string
  subtitle: string
  email: string
  phone: string
}) {
  const [copied, setCopied] = useState<string | null>(null)

  if (!open) return null

  async function copy(kind: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-[3px]" onClick={onClose} />
      <div className="animate-pop-in relative w-full max-w-[360px] rounded-[22px] bg-card p-6 shadow-[0_32px_90px_rgba(15,28,63,0.45)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-[9px] text-text-muted transition-colors hover:bg-fill"
        >
          <X size={17} />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-navy text-green">
            <UserRound size={20} />
          </span>
          <div>
            <div className="text-[15.5px] font-extrabold">{name}</div>
            <div className="text-[12px] text-text-muted">{subtitle}</div>
          </div>
        </div>

        <div className="grid gap-2.5">
          <Row
            icon={<Mail size={16} className="text-text-2" />}
            label="Email"
            value={email}
            copied={copied === 'email'}
            onCopy={() => copy('email', email)}
          />
          <Row
            icon={<Phone size={16} className="text-text-2" />}
            label="Phone"
            value={phone}
            copied={copied === 'phone'}
            onCopy={() => copy('phone', phone)}
          />
        </div>

        <p className="mt-4 text-center text-[11.5px] leading-snug text-text-faint">
          These are the contact details registered on Paybook.
        </p>
      </div>
    </div>
  )
}

function Row({
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
