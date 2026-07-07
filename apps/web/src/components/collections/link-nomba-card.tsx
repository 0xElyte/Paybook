'use client'

import { useState } from 'react'
import { Landmark, ShieldCheck, Loader2 } from 'lucide-react'
import { FloatingInput } from '@/components/ui/floating-input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

// One-time binding of the owner's own Nomba business account. Credentials are
// validated live (token issuance) before being stored encrypted server-side.
// Required before the first Collection: it's what makes payments land in the
// owner's own Nomba account rather than the platform's.
export function LinkNombaCard({ onLinked }: { onLinked: () => void }) {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/nomba-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: (fd.get('accountId') as string).trim(),
        clientId: (fd.get('clientId') as string).trim(),
        clientSecret: (fd.get('clientSecret') as string).trim(),
        subAccountId: (fd.get('subAccountId') as string).trim(),
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const { error: msg } = (await res.json().catch(() => ({ error: null }))) as { error: string | null }
      setError(msg ?? 'Could not link your Nomba account. Please try again.')
      return
    }

    addToast('Nomba account linked', 'Collections you create now settle directly into your own Nomba account.')
    onLinked()
  }

  return (
    <div className="animate-card-in rounded-card bg-card p-[30px] shadow-card">
      <div className="mb-1.5 flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-navy">
          <Landmark size={19} className="text-green" />
        </span>
        <h2 className="text-lg font-extrabold">Link your Nomba account</h2>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-text-muted">
        Your Collections settle directly into <span className="font-bold text-text-2">your own</span> Nomba business
        account — Paybook never holds your money. Grab these four values from your Nomba dashboard under{' '}
        <span className="font-semibold text-text-2">Settings → API Keys</span>. This is a one-time setup.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FloatingInput name="accountId" label="Account ID (parent)" required autoComplete="off" />
        <FloatingInput name="clientId" label="Client ID" required autoComplete="off" />
        <FloatingInput name="clientSecret" type="password" label="Client secret" required autoComplete="off" />
        <FloatingInput name="subAccountId" label="Sub-account ID (default settlement pocket)" required autoComplete="off" />

        <div className="flex items-start gap-2.5 rounded-[11px] border-l-[3px] border-green bg-green/[0.07] px-3.5 py-3">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-green-text-2" />
          <span className="text-[12.5px] leading-snug text-text-2">
            We verify these against Nomba before saving, encrypt the secret at rest, and never show it again — not
            even to you.
          </span>
        </div>

        {error && <p className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red-text">{error}</p>}

        <Button type="submit" variant="navy" disabled={loading} className="w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Verifying with Nomba…
            </span>
          ) : (
            'Link Nomba account'
          )}
        </Button>
      </form>
    </div>
  )
}
