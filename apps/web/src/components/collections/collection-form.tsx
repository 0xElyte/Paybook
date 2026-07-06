'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wallet, Layers, ListChecks, Loader2 } from 'lucide-react'
import { durationUnits, type CollectionInput, type InstallmentInput } from '@/lib/validations/collection'
import { FloatingInput, FloatingTextarea } from '@/components/ui/floating-input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { formatNGN } from '@/lib/utils'
import { InstallmentBuilder } from './installment-builder'
import { SuccessScreen } from './success-screen'

const repaymentTypes: { value: CollectionInput['repaymentType']; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: 'one_time', label: 'One-time', hint: 'Full amount in a single transfer', icon: <Wallet size={22} /> },
  { value: 'part_payment', label: 'Part payment', hint: 'Any number of partial transfers', icon: <Layers size={22} /> },
  { value: 'installment', label: 'Installments', hint: 'Fixed percentage-based schedule', icon: <ListChecks size={22} /> },
]

const defaultInstallments: InstallmentInput[] = [
  { percentage: 50, dueAfterValue: 30, dueAfterUnit: 'days' },
  { percentage: 50, dueAfterValue: 60, dueAfterUnit: 'days' },
]

const stepLabels = ['Details', 'Repayment', 'Schedule', 'Review']

export function CollectionForm() {
  const router = useRouter()
  const { addToast } = useToast()
  const [step, setStep] = useState(1)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')
  const [durationValue, setDurationValue] = useState('1')
  const [durationUnit, setDurationUnit] = useState<CollectionInput['durationUnit']>('months')
  const [repaymentType, setRepaymentType] = useState<CollectionInput['repaymentType']>('one_time')
  const [installments, setInstallments] = useState<InstallmentInput[]>(defaultInstallments)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ id: string; name: string; accountNumber: string; bankName: string } | null>(
    null
  )

  const isInstallment = repaymentType === 'installment'
  // Map the visible step index (skipping the installment-schedule step when not applicable)
  // onto the fixed 4-label progress bar for consistent labeling.
  const labelIndex = !isInstallment && step === 3 ? 3 : step - 1
  const stepPct = (labelIndex / 3) * 100

  function handleRepaymentTypeChange(next: CollectionInput['repaymentType']) {
    setRepaymentType(next)
    if (next === 'installment' && installments.length < 2) {
      setInstallments(defaultInstallments)
    }
  }

  function next() {
    if (step === 2 && !isInstallment) {
      setStep(4)
      return
    }
    setStep((s) => Math.min(4, s + 1))
  }
  function back() {
    if (step === 4 && !isInstallment) {
      setStep(2)
      return
    }
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)

    const payload = {
      name,
      description: description || undefined,
      chargeAmount: Number(chargeAmount),
      durationValue: Number(durationValue),
      durationUnit,
      repaymentType,
      installments: repaymentType === 'installment' ? installments : undefined,
    }

    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSubmitting(false)

    if (!res.ok) {
      // Guard against a non-JSON response (e.g. an unhandled server crash)
      // so a bad request never surfaces as a raw runtime error to the user.
      const msg = await res
        .json()
        .then((data: { error?: string }) => data.error)
        .catch(() => null)
      setError(msg ?? 'Something went wrong. Please try again.')
      return
    }

    const { collection } = (await res.json()) as {
      collection: { id: string; name: string; nombaAccountNo: string; nombaBankName: string }
    }

    setResult({
      id: collection.id,
      name: collection.name,
      accountNumber: collection.nombaAccountNo,
      bankName: collection.nombaBankName,
    })
    addToast('Collection created', `"${collection.name}" is live with its own virtual account.`)
  }

  if (result) {
    return (
      <SuccessScreen
        collectionId={result.id}
        collectionName={result.name}
        accountNumber={result.accountNumber}
        bankName={result.bankName}
      />
    )
  }

  const installmentsBalanced = Math.abs(installments.reduce((s, i) => s + i.percentage, 0) - 100) < 0.01

  return (
    <div className="mx-auto max-w-[860px] px-6 py-8 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="grid h-10 w-10 place-items-center rounded-[11px] border-[1.5px] border-border bg-card text-text-2 transition-colors hover:bg-fill"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">New Collection</h1>
          <p className="mt-0.5 text-sm text-text-muted">Set up how you&apos;ll collect payments.</p>
        </div>
      </div>

      <div className="mb-2 h-1.5 overflow-hidden rounded-pill bg-border">
        <div className="h-full rounded-pill bg-gradient-to-r from-green-deep to-green transition-all duration-400" style={{ width: `${stepPct}%` }} />
      </div>
      <div className="mb-6 flex justify-between text-xs font-semibold text-text-muted">
        {stepLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      {step === 1 && (
        <div className="animate-card-in rounded-card bg-card p-[30px] shadow-card">
          <h2 className="mb-[22px] text-lg font-extrabold">Collection details</h2>
          <FloatingInput
            label="Collection name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
            containerClassName="mb-5"
          />
          <FloatingTextarea
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            containerClassName="mb-5"
          />
          <div className="mb-5">
            <label className="mb-2 block text-[13px] font-semibold text-text-2">Charge amount</label>
            <div className="relative">
              <span className="absolute top-1/2 left-[18px] -translate-y-1/2 font-mono text-[22px] font-bold text-navy">
                ₦
              </span>
              <input
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                required
                className="h-16 w-full rounded-2xl border-[1.5px] border-border pr-[18px] pl-11 font-mono text-2xl font-extrabold outline-none focus:border-green"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-text-2">Cycle duration</label>
              <input
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                inputMode="numeric"
                required
                className="h-[50px] w-full rounded-control border-[1.5px] border-border px-4 text-[15px] outline-none focus:border-green"
              />
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-text-2">Unit</label>
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as CollectionInput['durationUnit'])}
                className="h-[50px] w-full rounded-control border-[1.5px] border-border bg-card px-3 text-[15px] outline-none focus:border-green"
              >
                {durationUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-[26px] flex justify-end">
            <Button
              variant="navy"
              onClick={next}
              disabled={!name || name.length < 3 || !chargeAmount || Number(chargeAmount) <= 0}
            >
              Continue →
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-card-in rounded-card bg-card p-[30px] shadow-card">
          <h2 className="mb-1.5 text-lg font-extrabold">Repayment type</h2>
          <p className="mb-[22px] text-sm text-text-muted">How should payers settle this collection?</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {repaymentTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleRepaymentTypeChange(t.value)}
                className={`rounded-2xl border-2 p-[18px] text-left transition-all hover:-translate-y-1 ${
                  repaymentType === t.value ? 'border-green bg-green/5' : 'border-border bg-card'
                }`}
              >
                <div
                  className={`mb-3.5 grid h-[46px] w-[46px] place-items-center rounded-xl ${
                    repaymentType === t.value ? 'bg-green text-navy' : 'bg-fill text-text-2'
                  }`}
                >
                  {t.icon}
                </div>
                <h3 className="mb-1 text-[15.5px] font-extrabold">{t.label}</h3>
                <p className="text-[12.5px] leading-snug text-text-muted">{t.hint}</p>
              </button>
            ))}
          </div>
          <div className="mt-[26px] flex justify-between">
            <Button variant="outline" onClick={back}>
              ← Back
            </Button>
            <Button variant="navy" onClick={next}>
              Continue →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && isInstallment && (
        <div className="animate-card-in">
          <div className="mb-5 rounded-card bg-card p-[30px] shadow-card">
            <h2 className="mb-1.5 text-lg font-extrabold">Installment schedule</h2>
            <p className="mb-5 text-sm text-text-muted">
              Drag to set each installment&apos;s share of {formatNGN(Number(chargeAmount) || 0)}.
            </p>
            <InstallmentBuilder
              installments={installments}
              onChange={setInstallments}
              chargeAmount={Number(chargeAmount) || 0}
            />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={back}>
              ← Back
            </Button>
            <Button variant="navy" onClick={next} disabled={!installmentsBalanced}>
              Review →
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="animate-card-in rounded-card bg-card p-[30px] shadow-card">
          <h2 className="mb-[22px] text-lg font-extrabold">Review &amp; confirm</h2>
          <div className="grid grid-cols-1 divide-y divide-border overflow-hidden rounded-2xl border-[1.5px] border-border">
            {[
              ['Collection name', name],
              ['Description', description || '—'],
              ['Charge amount', formatNGN(Number(chargeAmount) || 0)],
              ['Repayment type', repaymentTypes.find((t) => t.value === repaymentType)?.label ?? ''],
              ['Cycle duration', `${durationValue} ${durationUnit}`],
            ].map(([label, value], i) => (
              <div key={label} className={`flex justify-between px-[18px] py-4 ${i % 2 === 0 ? 'bg-card-subtle' : ''}`}>
                <span className="text-[13.5px] text-text-muted">{label}</span>
                <span className="max-w-[60%] text-right text-sm font-bold">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-[18px] flex items-center gap-2.5 rounded-[10px] border-l-[3px] border-blue bg-blue/[0.07] px-[15px] py-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="12" cy="12" r="9" stroke="#3B82F6" strokeWidth="1.8" />
              <path d="M12 8v.3M12 11v5" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="text-[13px] text-text-2">
              A permanent virtual account number will be generated. Your payers can save it and use it forever.
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-2.5 rounded-[10px] border-l-[3px] border-green bg-green/[0.07] px-[15px] py-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" stroke="#04794a" strokeWidth="1.7" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" stroke="#04794a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[13px] text-text-2">
              Funds go directly to this Collection&apos;s dedicated account — never through a personal account.
            </span>
          </div>

          {error && <p className="mt-4 rounded-lg bg-red/10 px-3 py-2 text-sm text-red-text">{error}</p>}

          <div className="mt-[26px] flex justify-between">
            <Button variant="outline" onClick={back} disabled={submitting}>
              ← Back
            </Button>
            <Button variant="green" onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Creating collection…' : 'Create Collection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
