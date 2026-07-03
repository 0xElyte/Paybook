'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { FloatingInput } from '@/components/ui/floating-input'
import { Button } from '@/components/ui/button'

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: formData.get('email') }),
    })

    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-green/15">
          <MailCheck className="text-green-text-2" size={26} />
        </div>
        <h2 className="mb-1.5 text-xl font-extrabold">Check your email</h2>
        <p className="mb-6 text-[15px] text-text-muted">
          If an account exists for that address, we&apos;ve sent a link to reset your password.
        </p>
        <Link href="/login" className="text-sm font-bold text-green-text-2 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="mb-1.5 text-[28px] font-extrabold tracking-tight">Reset your password</h2>
      <p className="mb-8 text-[15px] text-text-muted">
        Enter the email on your account and we&apos;ll send a link to reset your password.
      </p>
      <form onSubmit={handleSubmit} className="space-y-[18px]">
        <FloatingInput id="email" name="email" type="email" label="Email address" required autoComplete="email" />
        <Button type="submit" variant="navy" disabled={loading} className="w-full">
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-bold text-green-text-2 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
