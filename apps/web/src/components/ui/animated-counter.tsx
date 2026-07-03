'use client'

import { useEffect, useState } from 'react'
import { formatNGN } from '@/lib/utils'

export function AnimatedCounter({
  value,
  format = 'number',
  durationMs = 950,
}: {
  value: number
  format?: 'number' | 'currency'
  durationMs?: number
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let raf: number
    const start = performance.now()
    const step = (t: number) => {
      const progress = Math.min(1, (t - start) / durationMs)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  return <span className="tabular-nums">{format === 'currency' ? formatNGN(display) : display.toLocaleString('en-NG')}</span>
}
