'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Copy, Check } from 'lucide-react'

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
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckCircle2 className="text-green-600" size={32} />
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 mb-1">Collection created!</h2>
      <p className="text-gray-500 text-sm mb-6">
        &ldquo;{collectionName}&rdquo; is live with its own dedicated bank account.
      </p>

      <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6 mb-6">
        <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">{bankName}</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold text-gray-900 tracking-wider tabular-nums">
            {accountNumber}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-white/60 transition-colors"
            aria-label="Copy account number"
          >
            {copied ? <Check className="text-green-600" size={18} /> : <Copy className="text-gray-500" size={18} />}
          </button>
        </div>
        {copied && <p className="text-xs text-green-700 mt-2">Copied to clipboard</p>}
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Share this account number with your payers, or generate an invite link so they can join and register their
        own sending account.
      </p>

      <Link
        href={`/collections/${collectionId}`}
        className="inline-block w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
      >
        Generate invite link
      </Link>
    </div>
  )
}
