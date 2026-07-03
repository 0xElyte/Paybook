import Image from 'next/image'
import { VerifyEmailStatus } from '@/components/auth/verify-email-status'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Verify email' }

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-10">
      <div className="mb-8 flex items-center gap-2.5">
        <Image src="/paybook-mark.png" alt="Paybook" width={34} height={34} />
        <span className="text-[19px] font-extrabold text-text">Paybook</span>
      </div>
      <div className="w-full max-w-[420px]">
        <VerifyEmailStatus token={token ?? null} />
      </div>
    </div>
  )
}
