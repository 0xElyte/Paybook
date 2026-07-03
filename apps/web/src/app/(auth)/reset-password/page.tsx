import type { Metadata } from 'next'
import { AuthNavyPanel } from '@/components/auth/auth-navy-panel'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = { title: 'Reset password' }

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams

  return (
    <>
      <AuthNavyPanel
        heading="Collect smarter."
        body="Pick a new password and you're straight back into your collections."
      />
      <div className="flex items-center justify-center bg-card px-10 py-12">
        <div className="w-full max-w-[380px]">
          <ResetPasswordForm token={token ?? null} />
        </div>
      </div>
    </>
  )
}
