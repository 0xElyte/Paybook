'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatNGN } from '@/lib/utils'
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

type Step = 'overview' | 'login_or_register' | 'joining' | 'done'

export function InviteLandingClient({ link, collection }: Props) {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()
  const [step, setStep] = useState<Step>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The join response carries the account to pay into — the payer's own
  // personal VA when the per-payer strategy provisioned one, else the
  // collection's shared account.
  const [payAccount, setPayAccount] = useState<{ accountNo: string | null; bankName: string | null }>({
    accountNo: collection.nombaAccountNo,
    bankName: collection.nombaBankName,
  })
  const autoJoinFired = useRef(false)

  const hoursLeft = Math.max(0, Math.floor((new Date(link.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))

  async function join() {
    setLoading(true)
    setError(null)
    setStep('joining')

    const res = await fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteToken: link.token }),
    })

    setLoading(false)

    if (!res.ok) {
      const { error: msg } = (await res.json().catch(() => ({ error: null }))) as { error: string | null }
      if (res.status === 409) {
        // Already enrolled — not an error worth stranding them on; take them home.
        addToast('Already joined', `You're already a member of ${collection.name}.`)
        router.push('/dashboard')
        return
      }
      setError(msg ?? 'Failed to join collection')
      setStep('overview')
      return
    }

    const data = (await res.json().catch(() => null)) as {
      collection?: { nombaAccountNo: string | null; nombaBankName: string | null }
    } | null
    if (data?.collection) {
      setPayAccount({ accountNo: data.collection.nombaAccountNo, bankName: data.collection.nombaBankName })
    }

    setStep('done')
    addToast("You're in!", `You've joined ${collection.name}.`)
    setTimeout(() => router.push('/dashboard'), 6000)
  }

  // Auto-join the moment we come back authenticated from account creation
  // (the register page redirects to /invite/[token]?autojoin=1) — no re-pasting
  // the link, no extra clicks.
  useEffect(() => {
    if (
      status === 'authenticated' &&
      searchParams.get('autojoin') === '1' &&
      !autoJoinFired.current &&
      step === 'overview'
    ) {
      autoJoinFired.current = true
      void join()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, searchParams, step])

  function handleStart() {
    if (status === 'authenticated') {
      void join()
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
    if (result?.error) {
      setLoading(false)
      setError('Invalid email or password')
      return
    }
    // Signed in — join immediately, no intermediate step.
    await join()
  }

  const registerHref = `/register?redirect=${encodeURIComponent(`/invite/${link.token}?autojoin=1`)}`

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

        {error && <p className="mb-4 rounded-lg bg-red/10 px-3 py-2 text-sm text-red-text">{error}</p>}

        <Button variant="green" onClick={handleStart} disabled={loading} className="h-14 w-full text-base">
          {status === 'authenticated' ? 'Join this Collection' : 'Join this Collection'}
        </Button>
        {status !== 'authenticated' && (
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
        )}
      </div>
    )
  }

  if (step === 'login_or_register') {
    return (
      <div className="rounded-[22px] bg-card p-8 shadow-[0_1px_3px_rgba(15,28,63,0.05),0_24px_60px_rgba(15,28,63,0.12)]">
        <h2 className="mb-1.5 text-center text-xl font-extrabold">Sign in to continue</h2>
        <p className="mb-6 text-center text-sm text-text-muted">
          You need a Paybook account to join {collection.name}. You&apos;ll be added the moment you&apos;re in — no
          extra steps.
        </p>

        <form onSubmit={handleLoginAndContinue} className="space-y-4">
          <FloatingInput name="email" type="email" label="Email" required />
          <FloatingInput name="password" type="password" label="Password" required error={error ?? undefined} />
          <Button type="submit" variant="navy" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in & join'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          New to Paybook?{' '}
          <a href={registerHref} className="font-bold text-green-text-2 hover:underline">
            Create an account
          </a>
        </p>
      </div>
    )
  }

  if (step === 'joining') {
    return (
      <div className="rounded-[22px] bg-card p-10 text-center shadow-[0_1px_3px_rgba(15,28,63,0.05),0_24px_60px_rgba(15,28,63,0.12)]">
        <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-fill-2 border-t-green" />
        <h2 className="mb-1.5 text-lg font-extrabold">Adding you to {collection.name}…</h2>
        <p className="text-sm text-text-muted">Hang tight, this takes a second.</p>
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

      {payAccount.accountNo && (
        <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-navy-tint to-navy p-6 text-left text-white shadow-[0_18px_44px_rgba(15,28,63,0.35)]">
          <div className="mb-[22px] flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.08em] text-text-faint uppercase">
              {payAccount.accountNo !== collection.nombaAccountNo ? 'Your personal account · ' : ''}
              {payAccount.bankName}
            </span>
          </div>
          <MonoAccountNumber accountNumber={payAccount.accountNo} size="md" showCopy={false} className="text-white" />
          <div className="mt-1.5 text-[12.5px] text-text-faint">{collection.name}</div>
        </div>
      )}

      <p className="mx-auto mt-4 max-w-[340px] text-[12.5px] leading-snug text-text-muted">
        Pay from any bank account — your first payment gets confirmed once, and every payment after that matches to
        you automatically.
      </p>

      <button
        type="button"
        onClick={() => payAccount.accountNo && navigator.clipboard.writeText(payAccount.accountNo)}
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
