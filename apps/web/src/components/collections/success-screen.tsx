'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import confetti from 'canvas-confetti'
import { MonoAccountNumber } from '@/components/ui/mono-account-number'

export function SuccessScreen({
  collectionId,
  collectionName,
  accountNumber,
  bankName,
}: {
  collectionId: string
  collectionName: string
  accountNumber: string
  bankName: string
}) {
  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      startVelocity: 38,
      origin: { y: 0.35 },
      colors: ['#00D97E', '#00B368', '#0F1C3F'],
    })
  }, [])

  return (
    <div className="animate-route-in flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_30%,#EAFBF3,#F7F9FC)] px-6 py-10">
      <div className="w-full max-w-[460px] text-center">
        <div className="relative mx-auto mb-[26px] h-[130px] w-[130px]">
          <div className="animate-ripple absolute inset-0 rounded-full bg-green/[0.18]" />
          <div className="absolute inset-[18px] grid place-items-center rounded-full bg-green shadow-[0_14px_40px_rgba(0,217,126,0.45)]">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" className="animate-pop-in">
              <path d="M5 13l4 4L19 7" stroke="#0F1C3F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <h1 className="mb-2 text-[27px] font-extrabold tracking-tight">Collection created!</h1>
        <p className="mb-[26px] text-[15px] text-text-muted">
          Here&apos;s your permanent virtual account. Share it with your payers.
        </p>

        <div className="relative overflow-hidden rounded-card bg-navy p-6 text-left text-white shadow-[0_20px_50px_rgba(15,28,63,0.35)]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(105deg, transparent 30%, rgba(0,217,126,0.25) 50%, transparent 70%)',
              backgroundSize: '300px 100%',
              animation: 'revealSweep 2.2s ease-in-out infinite',
            }}
          />
          <div className="relative mb-[26px] flex items-start justify-between">
            <span className="text-xs font-bold tracking-[0.08em] text-text-faint uppercase">{bankName}</span>
            <Image src="/paybook-mark.png" alt="Paybook" width={26} height={26} className="opacity-90 brightness-0 invert" />
          </div>
          <div className="relative mb-2">
            <MonoAccountNumber accountNumber={accountNumber} size="lg" showCopy={false} className="text-white" />
          </div>
          <div className="relative text-[13px] text-text-faint">{collectionName}</div>
        </div>

        <CopyAccountButton accountNumber={accountNumber} />

        <Link href={`/collections/${collectionId}`} className="mt-2.5 block h-[50px] py-3.5 text-[14.5px] font-bold text-green-text-2">
          Generate your payer link →
        </Link>
      </div>
    </div>
  )
}

function CopyAccountButton({ accountNumber }: { accountNumber: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(accountNumber)}
      className="mt-[18px] flex h-[54px] w-full items-center justify-center gap-2.5 rounded-[13px] bg-navy text-[15.5px] font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.97]"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="9" width="11" height="11" rx="2" stroke="#00D97E" strokeWidth="1.8" />
        <path d="M5 15V5a2 2 0 012-2h8" stroke="#00D97E" strokeWidth="1.8" />
      </svg>
      Copy account number
    </button>
  )
}
