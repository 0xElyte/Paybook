import type { Metadata } from 'next'
import { AuthNavyPanel } from '@/components/auth/auth-navy-panel'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export const metadata: Metadata = { title: 'Forgot password' }

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthNavyPanel
        heading="Every naira, accounted for."
        body="Reset your password and get right back to collecting smarter."
      />
      <div className="flex items-center justify-center bg-card px-10 py-12">
        <div className="w-full max-w-[380px]">
          <ForgotPasswordForm />
        </div>
      </div>
    </>
  )
}
