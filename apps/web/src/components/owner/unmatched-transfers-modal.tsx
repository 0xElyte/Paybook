'use client'

import { useState } from 'react'
import { X, TriangleAlert, Loader2 } from 'lucide-react'
import { formatNGN, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'

interface UnmatchedTransfer {
  id: string
  amount: number
  senderName: string
  senderAccountNumber: string
  senderBank: string
  narration: string | null
  paidAt: string
}

interface PayerOption {
  enrollmentId: string
  payerName: string
}

// Owner review queue for transfers that hit the collection's virtual account
// from a sender no registered payer's bound bank accounts recognize. Each row
// carries a Match button: pick a registered payer and the assign endpoint
// applies the payment AND binds the sender account to that payer, so their
// future transfers auto-match (claim-and-bind).
export function UnmatchedTransfersModal({
  transfers,
  payers,
  open,
  onClose,
  onMatched,
}: {
  transfers: UnmatchedTransfer[]
  payers: PayerOption[]
  open: boolean
  onClose: () => void
  onMatched: (transactionId: string, enrollmentId: string) => void
}) {
  const { addToast } = useToast()
  const [matchingId, setMatchingId] = useState<string | null>(null)
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function startMatch(txId: string) {
    setMatchingId(txId)
    setSelectedEnrollmentId('')
    setError(null)
  }

  async function submitMatch(txId: string) {
    if (!selectedEnrollmentId || submitting) return
    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/transactions/${txId}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId: selectedEnrollmentId }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const data = (await res.json().catch(() => ({ error: null }))) as { error: string | null }
      setError(data.error ?? 'Failed to match transfer')
      return
    }

    const payer = payers.find((p) => p.enrollmentId === selectedEnrollmentId)
    addToast('Transfer matched', `Payment applied to ${payer?.payerName ?? 'the selected payer'}. Their account will auto-match next time.`)
    onMatched(txId, selectedEnrollmentId)
    setMatchingId(null)
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-[3px]" onClick={onClose} />

      <div className="animate-pop-in relative w-full max-w-[620px] overflow-hidden rounded-[22px] bg-card shadow-[0_32px_90px_rgba(15,28,63,0.45)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-amber/[0.15]">
              <TriangleAlert size={17} className="text-amber-text" />
            </span>
            <div>
              <h3 className="text-lg font-extrabold">Unmatched Transfers</h3>
              <p className="text-[12px] text-text-muted">
                Money that arrived from accounts no registered payer is known by yet
              </p>
            </div>
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

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {transfers.length === 0 ? (
            <div className="p-8 text-center text-text-faint">
              <p className="mb-2 text-3xl">✅</p>
              <p className="text-sm">All caught up — every transfer is matched to a payer.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {transfers.map((tx) => (
                <div key={tx.id} className="rounded-[13px] border border-amber/30 bg-amber/[0.05] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 font-mono text-[17px] font-extrabold text-navy">{formatNGN(tx.amount)}</div>
                      <div className="text-[13px] font-semibold">{tx.senderName}</div>
                      <div className="font-mono text-[12px] text-text-muted">
                        {tx.senderAccountNumber} · {tx.senderBank}
                      </div>
                      {tx.narration && (
                        <div className="mt-1 text-[12px] text-text-faint italic">&ldquo;{tx.narration}&rdquo;</div>
                      )}
                      <div className="mt-1 text-[11.5px] text-text-faint">{formatDate(tx.paidAt)}</div>
                    </div>
                    {matchingId !== tx.id && (
                      <Button variant="navy" onClick={() => startMatch(tx.id)} className="h-9 px-4 text-[13px]">
                        Match
                      </Button>
                    )}
                  </div>

                  {matchingId === tx.id && (
                    <div className="animate-float-up mt-3 flex flex-wrap items-center gap-2 rounded-[10px] bg-card p-3">
                      {payers.length === 0 ? (
                        <p className="text-[12.5px] text-text-muted">
                          No active payers in this collection yet — invite the sender first, then match.
                        </p>
                      ) : (
                        <>
                          <select
                            value={selectedEnrollmentId}
                            onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                            className="h-9 min-w-[180px] flex-1 rounded-lg border-[1.5px] border-border bg-card px-2.5 text-[13px] outline-none focus:border-green"
                          >
                            <option value="">Select registered payer…</option>
                            {payers.map((p) => (
                              <option key={p.enrollmentId} value={p.enrollmentId}>
                                {p.payerName}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="navy"
                            onClick={() => submitMatch(tx.id)}
                            disabled={!selectedEnrollmentId || submitting}
                            className="h-9 px-3 text-xs"
                          >
                            {submitting ? (
                              <span className="flex items-center gap-1.5">
                                <Loader2 size={13} className="animate-spin" /> Matching…
                              </span>
                            ) : (
                              'Confirm match'
                            )}
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" onClick={() => setMatchingId(null)} className="h-9 px-2.5 text-xs">
                        Cancel
                      </Button>
                      {error && <p className="w-full text-xs text-red-text">{error}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
