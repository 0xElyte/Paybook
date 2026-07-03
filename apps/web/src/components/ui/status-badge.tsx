import { cn } from '@/lib/utils'

export type StatusTone = 'green' | 'blue' | 'gray' | 'red' | 'amber'

const toneClasses: Record<StatusTone, string> = {
  green: 'bg-green/[0.14] text-green-text',
  blue: 'bg-blue/[0.13] text-blue-text',
  gray: 'bg-text-muted/[0.14] text-[#5A6788]',
  red: 'bg-red/[0.13] text-red-text',
  amber: 'bg-amber/[0.12] text-amber-text',
}

export function StatusBadge({
  label,
  tone,
  pulse = false,
  className,
}: {
  label: string
  tone: StatusTone
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-block rounded-pill px-2.5 py-0.5 text-xs font-bold capitalize',
        toneClasses[tone],
        pulse && 'animate-pulse-badge',
        className
      )}
    >
      {label}
    </span>
  )
}

// Maps the app's real enum values (EnrollmentStatus / InstallmentStatus / MatchStatus / CollectionStatus)
// to the design system's 4 visual status categories.
export function toneForStatus(status: string): { tone: StatusTone; pulse: boolean } {
  switch (status) {
    case 'paid':
    case 'active':
    case 'matched':
      return { tone: 'green', pulse: false }
    case 'partial':
      return { tone: 'blue', pulse: false }
    case 'overdue':
      return { tone: 'red', pulse: true }
    case 'unmatched':
    case 'exit_pending':
      return { tone: 'amber', pulse: false }
    default:
      return { tone: 'gray', pulse: false }
  }
}
