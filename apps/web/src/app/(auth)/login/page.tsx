import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthNavyPanel } from '@/components/auth/auth-navy-panel'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <>
      <AuthNavyPanel
        heading="Collect smarter."
        body="Virtual accounts, automatic matching, and clear repayment schedules — for everyone you collect from."
        showTestimonials
      />
      <div className="flex items-center justify-center bg-card px-10 py-12">
        <div className="w-full max-w-[380px]">
          <h2 className="mb-1.5 text-[28px] font-extrabold tracking-tight">Welcome back</h2>
          <p className="mb-8 text-[15px] text-text-muted">Sign in to your Paybook account.</p>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-text-muted">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-bold text-green-text-2 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
