'use client'

import { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { formatNGN } from '@/lib/utils'
import { nigerianBanks } from '@/lib/nigerian-banks'
import { FloatingInput } from '@/components/ui/floating-input'
import { Button } from '@/components/ui/button'
import { MonoAccountNumber } from '@/components/ui/mono-account-number'
import { useToast } from '@/components/ui/toast'

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
  const { addToast } = useToast()
  const [step, setStep] = useState<Step>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [bankQuery, setBankQuery] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [showBankList, setShowBankList] = useState(false)
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')

  const hoursLeft = Math.max(0, Math.floor((new Date(link.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))

  const bankMatches = nigerianBanks.filter((b) => b.name.toLowerCase().includes(bankQuery.toLowerCase())).slice(0, 6)

  function handleStart() {
    setStep(status === 'authenticated' ? 'bank_account' : 'login_or_register')
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
        bankName: bankQuery,
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
    addToast('You\'re in!', `You've joined ${collection.name}.`)
    setTimeout(() => router.push('/payer/collections'), 3000)
  }

  if (step === 'overview') {
    return (
      <div className="rounded-[22px] bg-card p-8 shadow-[0_1px_3px_rgba(15,28,63,0.05),0_24px_60px_rgba(15,28,63,0.12)]">
        <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-pill bg-amber/[0.12] px-3 py-1.5 text-[12.5px] font-bold text-amber-text">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#b45309" strokeWidth="2" />
            <path d="M12 7.5V12l3 2" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Expires in ~{hoursLeft}h
        </div>

        <p className="mb-1.5 text-center text-sm text-text-muted">You&apos;ve been invited to join</p>
        <h1 className="mb-1.5 text-center text-2xl font-extrabold tracking-tight">{collection.name}</h1>
        <p className="mb-[22px] text-center text-sm text-text-muted">by {collection.ownerName}</p>

        {collection.description && (
          <p className="mb-6 text-center text-sm leading-relaxed text-text-2">{collection.description}</p>
        )}

        <div className="mb-[26px] flex gap-2.5">
          <StatChip label="Amount" value={formatNGN(collection.chargeAmount)} mono />
          <StatChip label="Type" value={collection.repaymentType.replace('_', '-')} />
          <StatChip label="Cycle" value={`${collection.durationValue} ${collection.durationUnit}`} />
        </div>

        <Button variant="green" onClick={handleStart} className="h-14 w-full text-base">
          Join this Collection
        </Button>
        <p className="mt-4 text-center text-[13.5px] text-text-muted">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => setStep('login_or_register')}
            className="font-bold text-green-text-2"
          >
            Sign in
          </button>
        </p>
      </div>
    )
  }

  if (step === 'login_or_register') {
    return (
      <div className="rounded-[22px] bg-card p-8 shadow-[0_1px_3px_rgba(15,28,63,0.05),0_24px_60px_rgba(15,28,63,0.12)]">
        <h2 className="mb-1.5 text-center text-xl font-extrabold">Sign in to continue</h2>
        <p className="mb-6 text-center text-sm text-text-muted">You need a Paybook account to join {collection.name}</p>

        <form onSubmit={handleLoginAndContinue} className="space-y-4">
          <FloatingInput name="email" type="email" label="Email" required />
          <FloatingInput name="password" type="password" label="Password" required error={error ?? undefined} />
          <Button type="submit" variant="navy" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in & continue'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          New to Paybook?{' '}
          <a href={`/register?redirect=/invite/${link.token}`} className="font-bold text-green-text-2 hover:underline">
            Create an account
          </a>
        </p>
      </div>
    )
  }

  if (step === 'bank_account') {
    return (
      <div className="rounded-[22px] bg-card p-8 shadow-[0_1px_3px_rgba(15,28,63,0.05),0_24px_60px_rgba(15,28,63,0.12)]">
        <h2 className="mb-1.5 text-center text-xl font-extrabold">Register your sending account</h2>
        <p className="mb-5 text-center text-sm text-text-muted">
          This is the bank account you&apos;ll use to pay into {collection.name}. Payments from this account will be
          automatically matched to you.
        </p>

        <div className="mb-[18px] flex items-start gap-2.5 rounded-[11px] border-l-[3px] border-blue bg-blue/[0.07] px-3.5 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" stroke="#3B82F6" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" stroke="#3B82F6" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[12.5px] leading-snug text-text-2">
            We use this to automatically match your transfers to your profile. Your bank details are private and
            never shared with the collection owner.
          </span>
        </div>

        <form onSubmit={handleEnroll} className="space-y-4">
          <div className="relative">
            <label className="mb-1.5 block text-[13px] font-semibold text-text-2">Bank name</label>
            <input
              value={bankQuery}
              onChange={(e) => {
                setBankQuery(e.target.value)
                setBankCode('')
                setShowBankList(true)
              }}
              onFocus={() => setShowBankList(true)}
              onBlur={() => setTimeout(() => setShowBankList(false), 150)}
              placeholder="Search your bank"
              required
              className="h-[50px] w-full rounded-control border-[1.5px] border-border px-4 text-[15px] outline-none focus:border-green"
            />
            {showBankList && bankQuery && bankMatches.length > 0 && (
              <div className="animate-float-up absolute inset-x-0 top-[54px] z-10 max-h-[180px] overflow-y-auto rounded-control border border-border bg-card shadow-[0_12px_34px_rgba(15,28,63,0.14)]">
                {bankMatches.map((bank) => (
                  <button
                    key={bank.code}
                    type="button"
                    onMouseDown={() => {
                      setBankQuery(bank.name)
                      setBankCode(bank.code)
                      setShowBankList(false)
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-fill"
                  >
                    {bank.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-text-2">Account number</label>
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              inputMode="numeric"
              maxLength={10}
              placeholder="0123456789"
              required
              className="h-[50px] w-full rounded-control border-[1.5px] border-border px-4 font-mono text-[15px] tracking-wide outline-none focus:border-green"
            />
          </div>

          <FloatingInput
            label="Account name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Your name as it appears on the account"
            required
          />

          {error && <p className="rounded-lg bg-red/10 px-3 py-2 text-sm text-red-text">{error}</p>}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(status === 'authenticated' ? 'overview' : 'login_or_register')} className="flex-none">
              Back
            </Button>
            <Button type="submit" variant="navy" disabled={loading} className="flex-1">
              {loading ? 'Joining…' : 'Join collection'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  // step === 'done'
  return (
    <div className="rounded-[22px] bg-card p-8 text-center shadow-[0_1px_3px_rgba(15,28,63,0.05),0_24px_60px_rgba(15,28,63,0.12)]">
      <div className="relative mx-auto mb-[18px] h-[74px] w-[74px]">
        <div className="animate-ripple absolute inset-0 rounded-full bg-green/[0.16]" />
        <div className="absolute inset-2.5 grid place-items-center rounded-full bg-green">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="animate-pop-in">
            <path d="M5 13l4 4L19 7" stroke="#0F1C3F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <h2 className="mb-1.5 text-xl font-extrabold">You&apos;re in!</h2>
      <p className="mb-[22px] text-sm text-text-muted">Here&apos;s where to pay. Save this account number.</p>

      {collection.nombaAccountNo && (
        <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-navy-tint to-navy p-6 text-left text-white shadow-[0_18px_44px_rgba(15,28,63,0.35)]">
          <div className="mb-[22px] flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.08em] text-text-faint uppercase">
              {collection.nombaBankName}
            </span>
          </div>
          <MonoAccountNumber accountNumber={collection.nombaAccountNo} size="md" showCopy={false} className="text-white" />
          <div className="mt-1.5 text-[12.5px] text-text-faint">{collection.name}</div>
        </div>
      )}

      <button
        type="button"
        onClick={() => collection.nombaAccountNo && navigator.clipboard.writeText(collection.nombaAccountNo)}
        className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[13px] bg-green text-[15px] font-extrabold text-navy transition-transform active:scale-[0.97]"
      >
        Copy account number
      </button>
      <p className="mt-3 text-xs text-text-faint">Redirecting to your dashboard…</p>
    </div>
  )
}

function StatChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex-1 rounded-[13px] bg-surface px-2 py-3.5 text-center">
      <div className="mb-1 text-[11px] text-text-muted">{label}</div>
      <div className={`text-[15px] font-extrabold ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  )
}
