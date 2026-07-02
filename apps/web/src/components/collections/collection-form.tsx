'use client'

import { useState } from 'react'
import { durationUnits, repaymentTypes, type CollectionInput, type InstallmentInput } from '@/lib/validations/collection'
import { InstallmentBuilder } from './installment-builder'
import { SuccessScreen } from './success-screen'

const repaymentLabels: Record<(typeof repaymentTypes)[number], { label: string; hint: string }> = {
  one_time: { label: 'One-time', hint: 'Payers pay the full amount in a single transfer' },
  part_payment: { label: 'Part payment', hint: 'Payers pay any amount, any number of times, toward the total' },
  installment: { label: 'Installments', hint: 'Payers follow a fixed schedule of percentage-based installments' },
}

const defaultInstallments: InstallmentInput[] = [
  { percentage: 50, dueAfterValue: 30, dueAfterUnit: 'days' },
  { percentage: 50, dueAfterValue: 60, dueAfterUnit: 'days' },
]

export function CollectionForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')
  const [durationValue, setDurationValue] = useState('1')
  const [durationUnit, setDurationUnit] = useState<CollectionInput['durationUnit']>('months')
  const [repaymentType, setRepaymentType] = useState<CollectionInput['repaymentType']>('one_time')
  const [installments, setInstallments] = useState<InstallmentInput[]>(defaultInstallments)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ name: string; accountNumber: string; bankName: string } | null>(null)

  function handleRepaymentTypeChange(next: CollectionInput['repaymentType']) {
    setRepaymentType(next)
    if (next === 'installment' && installments.length < 2) {
      setInstallments(defaultInstallments)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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
      const { error: msg } = (await res.json()) as { error: string }
      setError(msg ?? 'Something went wrong')
      return
    }

    const { collection } = (await res.json()) as {
      collection: { name: string; nombaAccountNo: string; nombaBankName: string }
    }

    setResult({
      name: collection.name,
      accountNumber: collection.nombaAccountNo,
      bankName: collection.nombaBankName,
    })
  }

  if (result) {
    return (
      <SuccessScreen collectionName={result.name} accountNumber={result.accountNumber} bankName={result.bankName} />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Collection name
        </label>
        <input
          id="name"
          required
          minLength={3}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ikeja Duplex Rent"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you collecting for?"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm resize-none"
        />
      </div>

      <div>
        <label htmlFor="chargeAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Charge amount (₦)
        </label>
        <input
          id="chargeAmount"
          type="number"
          required
          min={1}
          step="0.01"
          value={chargeAmount}
          onChange={(e) => setChargeAmount(e.target.value)}
          placeholder="500000"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cycle length</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            required
            min={1}
            value={durationValue}
            onChange={(e) => setDurationValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          />
          <select
            value={durationUnit}
            onChange={(e) => setDurationUnit(e.target.value as CollectionInput['durationUnit'])}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
          >
            {durationUnits.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Repayment type</label>
        <div className="grid grid-cols-1 gap-2">
          {repaymentTypes.map((type) => (
            <label
              key={type}
              className={`flex items-start gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${
                repaymentType === type
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="repaymentType"
                value={type}
                checked={repaymentType === type}
                onChange={() => handleRepaymentTypeChange(type)}
                className="mt-0.5 accent-green-600"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">{repaymentLabels[type].label}</span>
                <span className="block text-xs text-gray-500">{repaymentLabels[type].hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {repaymentType === 'installment' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Installment schedule</label>
          <InstallmentBuilder installments={installments} onChange={setInstallments} />
        </div>
      )}

      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
      >
        {submitting ? 'Creating collection…' : 'Create collection'}
      </button>
    </form>
  )
}
