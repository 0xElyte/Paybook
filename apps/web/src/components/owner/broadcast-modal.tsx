'use client'

import { useMemo, useState } from 'react'
import { X, Megaphone, Check, Minus, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface PayerOption {
  payerId: string
  payerName: string
}

// Owner → payers broadcast for one Collection. Left: message + send. Right
// (behind a vertical divider): recipient list with a tri-state "Select all"
// master checkbox — full tick when everyone's selected, a horizontal bar when
// only some are, empty when none (and then Send is disabled).
export function BroadcastModal({
  collectionId,
  payers,
  open,
  onClose,
}: {
  collectionId: string
  payers: PayerOption[]
  open: boolean
  onClose: () => void
}) {
  const { addToast } = useToast()
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(payers.map((p) => p.payerId)))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allSelected = payers.length > 0 && selected.size === payers.length
  const someSelected = selected.size > 0 && !allSelected
  const canSend = selected.size > 0 && message.trim().length > 0 && !sending

  const sortedPayers = useMemo(() => [...payers].sort((a, b) => a.payerName.localeCompare(b.payerName)), [payers])

  if (!open) return null

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(payers.map((p) => p.payerId)))
  }

  function togglePayer(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function send() {
    if (!canSend) return
    setSending(true)
    setError(null)

    const res = await fetch(`/api/collections/${collectionId}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: message.trim(), payerIds: [...selected] }),
    })

    setSending(false)

    if (!res.ok) {
      const { error: msg } = (await res.json().catch(() => ({ error: null }))) as { error: string | null }
      setError(msg ?? 'Failed to send broadcast')
      return
    }

    const { recipientCount } = (await res.json()) as { recipientCount: number }
    addToast('Broadcast sent', `Delivered to ${recipientCount} payer${recipientCount === 1 ? '' : 's'}.`)
    setMessage('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-[3px]" onClick={onClose} />

      <div className="animate-pop-in relative w-full max-w-[640px] overflow-hidden rounded-[22px] bg-card shadow-[0_32px_90px_rgba(15,28,63,0.45)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-navy">
              <Megaphone size={17} className="text-green" />
            </span>
            <h3 className="text-lg font-extrabold">Broadcast to payers</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-[9px] text-text-muted transition-colors hover:bg-fill"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1px_1fr]">
          {/* message side */}
          <div className="flex flex-col p-6">
            <label className="mb-2 text-[13px] font-semibold text-text-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={7}
              placeholder="Write your message to the selected payers…"
              className="flex-1 resize-none rounded-[13px] border-[1.5px] border-border p-3.5 text-[14px] leading-relaxed outline-none focus:border-green"
            />
            <div className="mt-1.5 text-right text-[11px] text-text-faint">{message.length}/1000</div>

            {error && <p className="mt-2 rounded-lg bg-red/10 px-3 py-2 text-sm text-red-text">{error}</p>}

            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              className="shadow-green-cta mt-3 flex h-12 items-center justify-center gap-2 rounded-[13px] bg-green text-[14.5px] font-extrabold text-navy transition-all hover:scale-[1.02] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:scale-100"
            >
              {sending && <Loader2 size={16} className="animate-spin" />}
              {sending ? 'Sending…' : `Send Broadcast${selected.size > 0 ? ` (${selected.size})` : ''}`}
            </button>
          </div>

          {/* vertical divider */}
          <div className="hidden bg-border sm:block" />

          {/* recipients side */}
          <div className="flex max-h-[380px] flex-col border-t border-border p-6 sm:border-t-0">
            <button
              type="button"
              onClick={toggleAll}
              className="mb-3 flex items-center gap-2.5 text-[13.5px] font-bold text-text"
            >
              <TriCheckbox state={allSelected ? 'all' : someSelected ? 'some' : 'none'} />
              Select all
              <span className="ml-auto text-[12px] font-semibold text-text-muted">
                {selected.size}/{payers.length}
              </span>
            </button>

            <div className="-mx-1.5 flex-1 overflow-y-auto">
              {sortedPayers.length === 0 ? (
                <p className="px-1.5 py-4 text-[13px] text-text-muted">No active payers in this collection yet.</p>
              ) : (
                sortedPayers.map((p) => {
                  const checked = selected.has(p.payerId)
                  return (
                    <button
                      key={p.payerId}
                      type="button"
                      onClick={() => togglePayer(p.payerId)}
                      className="flex w-full items-center gap-2.5 rounded-[10px] px-1.5 py-2 text-left transition-colors hover:bg-fill"
                    >
                      <TriCheckbox state={checked ? 'all' : 'none'} />
                      <span className={`truncate text-[13.5px] ${checked ? 'font-bold' : 'font-semibold text-text-2'}`}>
                        {p.payerName}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Tri-state checkbox visual: tick (all), horizontal bar (some), empty (none).
function TriCheckbox({ state }: { state: 'all' | 'some' | 'none' }) {
  const filled = state !== 'none'
  return (
    <span
      aria-hidden
      className={`grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[6px] border-[1.5px] transition-colors ${
        filled ? 'border-green bg-green' : 'border-border bg-card'
      }`}
    >
      {state === 'all' && <Check size={13} strokeWidth={3.2} className="text-navy" />}
      {state === 'some' && <Minus size={13} strokeWidth={3.2} className="text-navy" />}
    </span>
  )
}
