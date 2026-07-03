'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function formatAccountNumber(value: string): string {
  return value.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function MonoAccountNumber({
  accountNumber,
  size = 'md',
  showCopy = true,
  className,
}: {
  accountNumber: string
  size?: 'sm' | 'md' | 'lg'
  showCopy?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sizeClasses = {
    sm: 'text-[13.5px]',
    md: 'text-lg',
    lg: 'text-[27px] tracking-[0.12em]',
  }[size]

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('font-mono font-bold tabular-nums', sizeClasses)}>
        {formatAccountNumber(accountNumber)}
      </span>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy account number"
          className="grid h-[26px] w-[26px] place-items-center rounded-[7px] text-text-muted transition-colors hover:bg-fill hover:text-green-text-2"
        >
          {copied ? <Check size={14} className="text-green-text-2" /> : <Copy size={14} />}
        </button>
      )}
      {copied && <span className="animate-float-up text-[11.5px] font-bold text-green-text-2">Copied!</span>}
    </span>
  )
}
