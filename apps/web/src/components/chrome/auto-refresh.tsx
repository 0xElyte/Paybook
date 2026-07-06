'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Simple polling stand-in for real-time updates: re-runs the server
// component's data fetch on an interval without a full page reload or
// disrupting client-side state (open tabs, in-progress forms, etc).
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])

  return null
}
