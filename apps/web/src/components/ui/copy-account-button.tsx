'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function CopyAccountButton({ accountNumber, className }: { accountNumber: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'flex h-11 w-full items-center justify-center gap-1.5 rounded-[11px] bg-white/[0.12] text-[13.5px] font-bold text-white transition-colors hover:bg-white/20',
        className
      )}
    >
      {copied ? 'Copied!' : 'Copy account number'}
    </button>
  )
}
