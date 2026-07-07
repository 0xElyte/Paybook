'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Scroll-driven reveal: fades/slides children in the first time they enter the
// viewport. Pure IntersectionObserver + CSS transitions — no animation library.
export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  className = '',
}: {
  children: ReactNode
  direction?: 'up' | 'left' | 'right' | 'scale'
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const dirClass =
    direction === 'left' ? 'reveal-left' : direction === 'right' ? 'reveal-right' : direction === 'scale' ? 'reveal-scale' : ''

  return (
    <div
      ref={ref}
      className={`reveal-base ${dirClass} ${inView ? 'reveal-in' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
