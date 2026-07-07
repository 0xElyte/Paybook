import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { AuthNavyPanel } from '@/components/auth/auth-navy-panel'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Create account' }

export default function RegisterPage() {
  return (
    <>
      <AuthNavyPanel
        heading="Every naira, accounted for."
        body="Create your account and start collecting in minutes. No spreadsheets, no chasing."
      />
      <div className="flex items-center justify-center bg-card px-10 py-12">
        <div className="w-full max-w-[380px]">
          <h2 className="mb-1.5 text-[28px] font-extrabold tracking-tight">Create your account</h2>
          <p className="mb-8 text-[15px] text-text-muted">Start collecting smarter today.</p>
          <Suspense>
            <RegisterForm />
          </Suspense>
          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-green-text-2 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
