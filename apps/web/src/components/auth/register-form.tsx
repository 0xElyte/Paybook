'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { FloatingInput } from '@/components/ui/floating-input'
import { Button } from '@/components/ui/button'

export function RegisterForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const email = formData.get('email') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: formData.get('fullName'),
        email,
        phone: formData.get('phone'),
        password,
      }),
    })

    if (!res.ok) {
      setLoading(false)
      const { error: msg } = (await res.json()) as { error: string }
      setError(msg ?? 'Registration failed')
      return
    }

    // Establish a session immediately so the new user lands straight on role
    // selection instead of being bounced back through a manual login step.
    await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    router.push('/onboarding/role')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[18px]">
      <FloatingInput id="fullName" name="fullName" type="text" label="Full name" required autoComplete="name" />
      <FloatingInput id="email" name="email" type="email" label="Email address" required autoComplete="email" />
      <FloatingInput id="phone" name="phone" type="tel" label="Phone number" required autoComplete="tel" />
      <FloatingInput
        id="password"
        name="password"
        type="password"
        label="Password"
        required
        minLength={8}
        autoComplete="new-password"
      />
      <FloatingInput
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm password"
        required
        minLength={8}
        autoComplete="new-password"
        error={error ?? undefined}
      />

      <Button type="submit" variant="navy" disabled={loading} className="w-full">
        {loading ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}
