'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { FloatingInput } from '@/components/ui/floating-input'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    const result = await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[18px]">
      <FloatingInput id="email" name="email" type="email" label="Email address" required autoComplete="email" />
      <div>
        <FloatingInput
          id="password"
          name="password"
          type="password"
          label="Password"
          required
          autoComplete="current-password"
          error={error ?? undefined}
        />
        <div className="mt-1.5 text-right">
          <Link href="/forgot-password" className="text-[13px] font-bold text-green-text-2 hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" variant="navy" disabled={loading} className="w-full">
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
