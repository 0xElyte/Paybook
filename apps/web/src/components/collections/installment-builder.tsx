'use client'

import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { InstallmentInput } from '@/lib/validations/collection'
import { durationUnits } from '@/lib/validations/collection'
import { formatNGN } from '@/lib/utils'

const MIN_INSTALLMENTS = 2
const MAX_INSTALLMENTS = 12
const ROW_COLORS = ['#00D97E', '#0F1C3F', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444']

export function emptyInstallment(percentage = 0): InstallmentInput {
  return { percentage, dueAfterValue: 30, dueAfterUnit: 'days' }
}

export function InstallmentBuilder({
  installments,
  onChange,
  chargeAmount,
}: {
  installments: InstallmentInput[]
  onChange: (next: InstallmentInput[]) => void
  chargeAmount: number
}) {
  const total = installments.reduce((sum, i) => sum + i.percentage, 0)
  const isBalanced = Math.abs(total - 100) < 0.01
  const [shakeIndex, setShakeIndex] = useState<number | null>(null)
  const trackRefs = useRef<(HTMLDivElement | null)[]>([])

  function roomFor(index: number): number {
    const others = installments.reduce((sum, inst, i) => (i === index ? sum : sum + inst.percentage), 0)
    return Math.max(0, 100 - others)
  }

  function update(index: number, patch: Partial<InstallmentInput>) {
    onChange(installments.map((inst, i) => (i === index ? { ...inst, ...patch } : inst)))
  }

  function setPercentage(index: number, raw: number) {
    const max = roomFor(index)
    if (raw > max) {
      update(index, { percentage: Math.round(max) })
      setShakeIndex(index)
      setTimeout(() => setShakeIndex(null), 400)
      return
    }
    update(index, { percentage: Math.max(0, Math.round(raw)) })
  }

  function startDrag(index: number, e: React.PointerEvent) {
    e.preventDefault()
    const track = trackRefs.current[index]
    if (!track) return

    function onMove(ev: PointerEvent) {
      const rect = track!.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setPercentage(index, Math.round(Math.min(100, Math.max(0, pct))))
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
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

  // Donut chart segments
  const circumference = 2 * Math.PI * 52
  let cumulativeOffset = 0
  const segments = installments.map((inst, i) => {
    const dash = (inst.percentage / 100) * circumference
    const seg = { color: ROW_COLORS[i % ROW_COLORS.length], dash: `${dash} ${circumference}`, offset: -cumulativeOffset }
    cumulativeOffset += dash
    return seg
  })

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_260px]">
      <div className="grid gap-3.5">
        {installments.map((inst, index) => {
          const color = ROW_COLORS[index % ROW_COLORS.length]
          const room = roomFor(index)
          return (
            <div
              key={index}
              className={`rounded-2xl border-[1.5px] border-border p-4 transition-colors ${shakeIndex === index ? 'animate-shake' : ''}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid h-[22px] w-[22px] place-items-center rounded-[6px] text-xs font-bold text-white"
                    style={{ background: color }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold">Installment {index + 1}</span>
                  <span className="rounded-pill bg-fill px-2 py-0.5 text-[11.5px] text-text-faint">
                    up to {Math.round(room)}%
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[13px] font-bold text-green-text">
                    {formatNGN((inst.percentage / 100) * chargeAmount)}
                  </span>
                  {installments.length > MIN_INSTALLMENTS && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label={`Remove installment ${index + 1}`}
                      className="grid h-[26px] w-[26px] place-items-center rounded-[7px] text-text-faint transition-colors hover:bg-red/10 hover:text-red"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div
                  ref={(el) => {
                    trackRefs.current[index] = el
                  }}
                  className="relative flex h-[26px] flex-1 cursor-pointer items-center"
                  onPointerDown={(e) => startDrag(index, e)}
                >
                  <div className="absolute inset-x-0 h-2 rounded-pill bg-fill-2" />
                  <div
                    className="absolute left-0 h-2 rounded-pill transition-[width] duration-75"
                    style={{ width: `${inst.percentage}%`, background: color }}
                  />
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      startDrag(index, e)
                    }}
                    className="absolute h-5 w-5 -translate-x-1/2 cursor-grab rounded-full border-[3px] bg-card shadow-[0_2px_6px_rgba(15,28,63,0.2)] touch-none"
                    style={{ left: `${inst.percentage}%`, borderColor: color }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <input
                    value={inst.percentage}
                    onChange={(e) => setPercentage(index, Number(e.target.value) || 0)}
                    inputMode="numeric"
                    className="h-[34px] w-11 rounded-lg border-[1.5px] border-border text-right font-mono text-sm font-bold outline-none focus:border-green"
                  />
                  <span className="text-sm font-bold text-text-muted">%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-muted">due +</span>
                  <input
                    value={inst.dueAfterValue}
                    onChange={(e) => update(index, { dueAfterValue: Number(e.target.value) || 1 })}
                    inputMode="numeric"
                    className="h-[34px] w-12 rounded-lg border-[1.5px] border-border text-center font-mono text-[13px] font-bold outline-none focus:border-green"
                  />
                  <select
                    value={inst.dueAfterUnit}
                    onChange={(e) => update(index, { dueAfterUnit: e.target.value as InstallmentInput['dueAfterUnit'] })}
                    className="h-[34px] rounded-lg border-[1.5px] border-border bg-card px-1.5 text-xs font-medium outline-none focus:border-green"
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
          )
        })}

        <button
          type="button"
          onClick={add}
          disabled={installments.length >= MAX_INSTALLMENTS}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-fill text-sm font-bold text-navy transition-colors hover:bg-fill-2 disabled:opacity-40"
        >
          <Plus size={17} /> Add installment
        </button>
      </div>

      <div className="rounded-card bg-card p-6 shadow-card lg:sticky lg:top-5">
        <h3 className="mb-4 text-center text-sm font-extrabold">Split preview</h3>
        <div className="relative mx-auto mb-4 h-[140px] w-[140px]">
          <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
            <circle cx="70" cy="70" r="52" fill="none" stroke="#EEF2F8" strokeWidth="16" />
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx="70"
                cy="70"
                r="52"
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={seg.dash}
                strokeDashoffset={seg.offset}
                className="transition-all duration-250"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono text-2xl font-extrabold ${isBalanced ? 'text-green-text' : 'text-amber-text'}`}>
              {total.toFixed(0)}%
            </span>
            <span className="text-[11px] text-text-muted">allocated</span>
          </div>
        </div>
        {isBalanced ? (
          <div className="flex items-center justify-center gap-1.5 rounded-[10px] bg-green/10 p-2 text-[12.5px] font-bold text-green-text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#04794a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Fully allocated
          </div>
        ) : (
          <p className="text-center text-[12.5px] font-semibold text-text-muted">
            {(100 - total).toFixed(0)}% remaining to allocate
          </p>
        )}
      </div>
    </div>
  )
}
