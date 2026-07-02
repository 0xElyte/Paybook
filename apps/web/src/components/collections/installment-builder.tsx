'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { InstallmentInput } from '@/lib/validations/collection'
import { durationUnits } from '@/lib/validations/collection'

const MIN_INSTALLMENTS = 2
const MAX_INSTALLMENTS = 12

export function emptyInstallment(percentage = 0): InstallmentInput {
  return { percentage, dueAfterValue: 30, dueAfterUnit: 'days' }
}

export function InstallmentBuilder({
  installments,
  onChange,
}: {
  installments: InstallmentInput[]
  onChange: (next: InstallmentInput[]) => void
}) {
  const total = installments.reduce((sum, i) => sum + i.percentage, 0)
  const isBalanced = Math.abs(total - 100) < 0.01

  function update(index: number, patch: Partial<InstallmentInput>) {
    onChange(installments.map((inst, i) => (i === index ? { ...inst, ...patch } : inst)))
  }

  function remove(index: number) {
    if (installments.length <= MIN_INSTALLMENTS) return
    onChange(installments.filter((_, i) => i !== index))
  }

  function add() {
    if (installments.length >= MAX_INSTALLMENTS) return
    const remaining = Math.max(0, 100 - total)
    onChange([...installments, emptyInstallment(Math.round(remaining))])
  }

  return (
    <div className="space-y-3">
      {installments.map((inst, index) => (
        <div key={index} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Installment {index + 1}</span>
            <button
              type="button"
              onClick={() => remove(index)}
              disabled={installments.length <= MIN_INSTALLMENTS}
              className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label={`Remove installment ${index + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500">Percentage of total</label>
              <span className="text-sm font-semibold text-green-700">{inst.percentage}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={inst.percentage}
              onChange={(e) => update(index, { percentage: Number(e.target.value) })}
              className="w-full accent-green-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Due after</label>
              <input
                type="number"
                min={1}
                value={inst.dueAfterValue}
                onChange={(e) => update(index, { dueAfterValue: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
              <select
                value={inst.dueAfterUnit}
                onChange={(e) =>
                  update(index, { dueAfterUnit: e.target.value as InstallmentInput['dueAfterUnit'] })
                }
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {durationUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        disabled={installments.length >= MAX_INSTALLMENTS}
        className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-xl py-2.5 text-sm text-gray-500 hover:text-green-700 hover:border-green-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={16} /> Add installment
      </button>

      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full transition-all ${isBalanced ? 'bg-green-600' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(100, total)}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${isBalanced ? 'text-green-700' : 'text-amber-600'}`}>
          {total.toFixed(0)}%
        </span>
      </div>
      {!isBalanced && (
        <p className="text-xs text-amber-600">Percentages must add up to exactly 100% before you can continue.</p>
      )}
    </div>
  )
}
