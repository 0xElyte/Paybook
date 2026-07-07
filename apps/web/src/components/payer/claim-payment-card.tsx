'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HandCoins } from 'lucide-react'
import { formatNGN, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface UnmatchedTx {
  id: string
  amount: number
  senderName: string
  senderBank: string
  senderAccountNumber: string
  paidAt: string
}

// "Was this you?" — unmatched payments in a collection the payer is enrolled in.
// One tap applies the payment to their balance AND binds the sending account so
// every future transfer from it auto-matches (claim-and-bind).
export function ClaimPaymentCard({ transactions }: { transactions: UnmatchedTx[] }) {
  const router = useRouter()
  const { addToast } = useToast()
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (transactions.length === 0) return null

  async function claim(id: string) {
    setClaimingId(id)
    setError(null)

    const res = await fetch(`/api/transactions/${id}/claim`, { method: 'POST' })

    if (!res.ok) {
      const { error: msg } = (await res.json().catch(() => ({ error: null }))) as { error: string | null }
      setError(msg ?? 'Could not claim this payment. Please try again.')
      setClaimingId(null)
      return
    }

    addToast('Payment claimed', 'It now counts toward your balance, and future transfers will match automatically.')
    setClaimingId(null)
    router.refresh()
  }

  return (
    <div className="rounded-card border-[1.5px] border-green/40 bg-green/[0.05] p-[22px] shadow-card">
      <div className="mb-1 flex items-center gap-2">
        <HandCoins size={18} className="text-green-text-2" />
        <h2 className="text-base font-extrabold">Recent payments — was one of these you?</h2>
      </div>
      <p className="mb-4 text-[13px] leading-snug text-text-muted">
        These transfers arrived in this collection but aren&apos;t linked to anyone yet. Claiming one adds it to your
        balance and links your bank account for automatic matching going forward.
      </p>

      {error && <p className="mb-3 rounded-lg bg-red/10 px-3 py-2 text-sm text-red-text">{error}</p>}

      <div className="grid gap-2.5">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[13px] bg-card px-4 py-3.5 shadow-card"
          >
            <div>
              <div className="font-mono text-[15px] font-extrabold">{formatNGN(tx.amount)}</div>
              <div className="text-xs text-text-muted">
                from {tx.senderName} · {tx.senderBank} ····{tx.senderAccountNumber.slice(-4)} ·{' '}
                {formatDate(tx.paidAt)}
              </div>
            </div>
            <button
              type="button"
              disabled={claimingId !== null}
              onClick={() => claim(tx.id)}
              className="h-10 rounded-control bg-green px-4 text-[13.5px] font-extrabold text-navy transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-60"
            >
              {claimingId === tx.id ? 'Claiming…' : 'This was me'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
