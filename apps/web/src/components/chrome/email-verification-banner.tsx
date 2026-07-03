'use client'

import { useState } from 'react'
import { MailWarning } from 'lucide-react'

export function EmailVerificationBanner() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function resend() {
    setStatus('sending')
    const res = await fetch('/api/auth/resend-verification', { method: 'POST' })
    setStatus(res.ok ? 'sent' : 'idle')
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[13px] border-l-[3px] border-amber bg-amber/[0.08] px-4 py-3.5">
      <MailWarning size={18} className="shrink-0 text-amber-text" />
      <span className="flex-1 text-[13px] text-text-2">
        Verify your email to confirm it&apos;s really you — this doesn&apos;t block anything, but it&apos;s worth doing.
      </span>
      <button
        type="button"
        onClick={resend}
        disabled={status !== 'idle'}
        className="shrink-0 text-[13px] font-bold text-amber-text underline decoration-dotted disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Link sent!' : 'Resend link'}
      </button>
    </div>
  )
}
