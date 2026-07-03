'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { FloatingInput } from '@/components/ui/floating-input'
import { Button } from '@/components/ui/button'

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!token) {
      setError('This reset link is missing its token. Request a new one.')
      return
    }

    const formData = new FormData(e.currentTarget)
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    })
    setLoading(false)

    if (!res.ok) {
      const { error: msg } = (await res.json()) as { error: string }
      setError(msg ?? 'Could not reset password')
      return
    }

    setDone(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-green/15">
          <CheckCircle2 className="text-green-text-2" size={26} />
        </div>
        <h2 className="mb-1.5 text-xl font-extrabold">Password updated</h2>
        <p className="text-[15px] text-text-muted">Redirecting you to sign in…</p>
      </div>
    )
  }

  return (
    <>
      <h2 className="mb-1.5 text-[28px] font-extrabold tracking-tight">Choose a new password</h2>
      <p className="mb-8 text-[15px] text-text-muted">Make it at least 8 characters.</p>
      <form onSubmit={handleSubmit} className="space-y-[18px]">
        <FloatingInput id="newPassword" name="newPassword" type="password" label="New password" required minLength={8} autoComplete="new-password" />
        <FloatingInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm new password"
          required
          minLength={8}
          autoComplete="new-password"
          error={error ?? undefined}
        />
        <Button type="submit" variant="navy" disabled={loading || !token} className="w-full">
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-muted">
        <Link href="/forgot-password" className="font-bold text-green-text-2 hover:underline">
          Request a new link
        </Link>
      </p>
    </>
  )
}
