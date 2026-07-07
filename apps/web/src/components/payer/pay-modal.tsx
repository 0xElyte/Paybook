'use client'

import { useState } from 'react'
import { X, Copy, Check, Banknote, ArrowRight } from 'lucide-react'
import { formatNGN } from '@/lib/utils'

interface Props {
  collectionName: string
  bankName: string
  accountNumber: string
  isPersonal: boolean // payer's own dedicated VA vs the collection's shared account
  amountDue: number
  dueLabel: string // e.g. "Installment 2 of 3" or "Outstanding balance"
}

// Single "Make a payment" action for payers: opens a modal with everything
// needed to complete a manual bank transfer — the account to pay into, the
// amount due, and what happens after (automatic matching).
export function PayModal({ collectionName, bankName, accountNumber, isPersonal, amountDue, dueLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'account' | 'amount' | null>(null)

  async function copy(kind: 'account' | 'amount', value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  const steps = [
    'Open your bank app and start a transfer',
    `Paste the account number — the bank name is ${bankName}`,
    `Send ${amountDue > 0 ? formatNGN(amountDue) : 'any amount'} (partial amounts are fine too)`,
    isPersonal
      ? 'Done — this account is yours alone, so the payment matches to you instantly'
      : 'Done — your payment is matched to you automatically',
  ]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shadow-green-cta flex h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-green text-[15px] font-extrabold text-navy transition-all hover:scale-[1.02] active:scale-[0.97]"
      >
        <Banknote size={18} />
        Make a payment
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-[3px]" onClick={() => setOpen(false)} />

          <div className="animate-pop-in relative w-full max-w-[420px] overflow-hidden rounded-[22px] bg-card shadow-[0_32px_90px_rgba(15,28,63,0.45)]">
            {/* header */}
            <div className="relative bg-gradient-to-br from-navy-tint to-navy p-6 text-white">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X size={17} />
              </button>

              <div className="mb-1 text-[11px] font-bold tracking-[0.1em] text-text-faint uppercase">
                {isPersonal ? 'Your personal account' : 'Collection account'} · {bankName}
              </div>
              <div className="mb-4 text-[13px] text-white/70">{collectionName}</div>

              <button
                type="button"
                onClick={() => copy('account', accountNumber)}
                className="group flex w-full items-center justify-between rounded-[14px] bg-white/[0.07] px-4 py-3.5 transition-colors hover:bg-white/[0.12]"
              >
                <span className="font-mono text-[24px] font-bold tracking-[0.12em]">{accountNumber}</span>
                <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-green text-navy">
                  {copied === 'account' ? <Check size={17} /> : <Copy size={16} />}
                </span>
              </button>
              {copied === 'account' && (
                <p className="mt-1.5 text-center text-[11.5px] font-bold text-green">Account number copied</p>
              )}
            </div>

            {/* body */}
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between rounded-[13px] bg-fill px-4 py-3.5">
                <div>
                  <div className="text-[11.5px] font-semibold text-text-muted">{dueLabel}</div>
                  <div className="font-mono text-[21px] font-extrabold tracking-tight">
                    {amountDue > 0 ? formatNGN(amountDue) : 'Fully paid 🎉'}
                  </div>
                </div>
                {amountDue > 0 && (
                  <button
                    type="button"
                    onClick={() => copy('amount', String(amountDue))}
                    className="flex h-9 items-center gap-1.5 rounded-[10px] border-[1.5px] border-border bg-card px-3 text-[12.5px] font-bold text-text-2 transition-colors hover:bg-fill-2"
                  >
                    {copied === 'amount' ? <Check size={14} className="text-green-text-2" /> : <Copy size={13} />}
                    {copied === 'amount' ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>

              <ol className="mb-5 grid gap-2.5">
                {steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green/[0.14] text-[11.5px] font-extrabold text-green-text">
                      {i + 1}
                    </span>
                    <span className="text-[13.5px] leading-snug text-text-2">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="flex items-center gap-2 rounded-[11px] border-l-[3px] border-green bg-green/[0.07] px-3.5 py-3">
                <ArrowRight size={15} className="shrink-0 text-green-text-2" />
                <span className="text-[12.5px] leading-snug text-text-2">
                  Your dashboard updates within seconds of the transfer landing — no screenshots needed.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
