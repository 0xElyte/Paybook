'use client'

import { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { formatNGN } from '@/lib/utils'

interface InstallmentInfo {
  sequenceIndex: number
  percentage: number
  dueAfterValue: number
  dueAfterUnit: string
}

interface Props {
  link: {
    id: string
    token: string
    expiresAt: string
  }
  collection: {
    id: string
    name: string
    description: string | null
    chargeAmount: number
    repaymentType: string
    durationValue: number
    durationUnit: string
    nombaAccountNo: string | null
    nombaBankName: string | null
    ownerName: string
    installments: InstallmentInfo[]
  }
}

type Step = 'overview' | 'login_or_register' | 'bank_account' | 'done'

export function InviteLandingClient({ link, collection }: Props) {
  const { status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<Step>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [bankName, setBankName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')

  const hoursLeft = Math.max(
    0,
    Math.floor((new Date(link.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60))
  )

  function handleStart() {
    if (status === 'authenticated') {
      setStep('bank_account')
    } else {
      setStep('login_or_register')
    }
  }

  async function handleLoginAndContinue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: fd.get('email') as string,
      password: fd.get('password') as string,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password')
      return
    }
    setStep('bank_account')
  }

  async function handleEnroll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteToken: link.token,
        bankName,
        bankCode,
        accountNumber,
        accountName,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const { error: msg } = (await res.json()) as { error: string }
      setError(msg ?? 'Failed to join collection')
      return
    }

    setStep('done')
    setTimeout(() => router.push('/payer/collections'), 3000)
  }

  if (step === 'overview') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-6">
          <p className="text-sm text-green-600 font-medium mb-1">You&apos;re invited to join</p>
          <h2 className="text-2xl font-bold text-gray-900">{collection.name}</h2>
          {collection.description && (
            <p className="text-gray-500 text-sm mt-2">{collection.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">by {collection.ownerName}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount</span>
            <span className="font-semibold text-gray-900">{formatNGN(collection.chargeAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Payment type</span>
            <span className="font-semibold text-gray-900 capitalize">
              {collection.repaymentType.replace('_', '-')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Cycle</span>
            <span className="font-semibold text-gray-900">
              Every {collection.durationValue} {collection.durationUnit}
            </span>
          </div>

          {collection.repaymentType === 'installment' && collection.installments.length > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">Payment schedule</p>
              {collection.installments.map((inst) => (
                <div key={inst.sequenceIndex} className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Installment {inst.sequenceIndex}</span>
                  <span>
                    {inst.percentage}% — due after {inst.dueAfterValue} {inst.dueAfterUnit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
          This link expires in ~{hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}
        </p>

        <button
          onClick={handleStart}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
        >
          Join this collection
        </button>
      </div>
    )
  }

  if (step === 'login_or_register') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in to continue</h2>
        <p className="text-gray-500 text-sm mb-6">You need a Paybook account to join {collection.name}</p>

        <form onSubmit={handleLoginAndContinue} className="space-y-4">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in & continue'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          New to Paybook?{' '}
          <a href={`/register?redirect=/invite/${link.token}`} className="text-green-600 font-medium hover:underline">
            Create an account
          </a>
        </p>
      </div>
    )
  }

  if (step === 'bank_account') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Register your sending account</h2>
        <p className="text-gray-500 text-sm mb-6">
          This is the bank account you&apos;ll use to pay into {collection.name}. Payments from this account
          will be automatically matched to you.
        </p>

        <form onSubmit={handleEnroll} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank name</label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. Wema Bank"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank code</label>
            <input
              type="text"
              required
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              placeholder="e.g. 035"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account number</label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="10-digit account number"
              maxLength={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account name</label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Your name as it appears on the account"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Joining…' : 'Join collection'}
          </button>
        </form>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">You&apos;re in!</h2>
        <p className="text-gray-500 text-sm mb-4">
          You&apos;ve successfully joined <strong>{collection.name}</strong>.
        </p>
        {collection.nombaAccountNo && (
          <div className="bg-green-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-500 mb-1">Pay into this account</p>
            <p className="text-2xl font-mono font-bold text-green-700">{collection.nombaAccountNo}</p>
            <p className="text-sm text-gray-600">{collection.nombaBankName}</p>
          </div>
        )}
        <p className="text-xs text-gray-400">Redirecting to your dashboard…</p>
      </div>
    )
  }

  return null
}
