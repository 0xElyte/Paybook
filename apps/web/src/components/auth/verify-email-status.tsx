'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type Status = 'pending' | 'success' | 'error'

export function VerifyEmailStatus({ token }: { token: string | null }) {
  const [status, setStatus] = useState<Status>('pending')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('This verification link is missing its token.')
      return
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success')
          return
        }
        const data = (await res.json()) as { error: string }
        setStatus('error')
        setMessage(data.error ?? 'Verification failed')
      })
      .catch(() => {
        setStatus('error')
        setMessage('Something went wrong. Try again from your dashboard.')
      })
    // Runs once per mount — the token itself is the intended dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="rounded-card bg-card p-10 text-center shadow-card">
      {status === 'pending' && (
        <>
          <Loader2 className="mx-auto mb-4 animate-spin text-text-muted" size={36} />
          <h1 className="mb-1.5 text-xl font-extrabold">Verifying your email…</h1>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-green/15">
            <CheckCircle2 className="text-green-text-2" size={32} />
          </div>
          <h1 className="mb-1.5 text-xl font-extrabold">Email verified</h1>
          <p className="mb-6 text-[15px] text-text-muted">Your email address is confirmed.</p>
          <Link href="/" className="text-sm font-bold text-green-text-2 hover:underline">
            Go to dashboard →
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-red/10">
            <XCircle className="text-red" size={32} />
          </div>
          <h1 className="mb-1.5 text-xl font-extrabold">Verification failed</h1>
          <p className="mb-6 text-[15px] text-text-muted">{message}</p>
          <Link href="/" className="text-sm font-bold text-green-text-2 hover:underline">
            Go to dashboard →
          </Link>
        </>
      )}
    </div>
  )
}
