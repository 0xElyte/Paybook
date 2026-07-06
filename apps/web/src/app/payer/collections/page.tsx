import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatNGN, formatDate } from '@/lib/utils'
import { TopNav } from '@/components/chrome/top-nav'
import { EmailVerificationBanner } from '@/components/chrome/email-verification-banner'
import { AutoRefresh } from '@/components/chrome/auto-refresh'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { StatusBadge, toneForStatus } from '@/components/ui/status-badge'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Payments' }

function urgencyTone(dueAt: Date, status: string): 'green' | 'amber' | 'red' {
  if (status === 'overdue') return 'red'
  const daysLeft = (dueAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysLeft <= 7) return 'amber'
  return 'green'
}

export default async function PayerCollectionsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const enrollments = await prisma.enrollment.findMany({
    where: { payerId: userId, status: { in: ['active', 'exit_pending'] } },
    include: {
      collection: {
        select: {
          id: true,
          name: true,
          chargeAmount: true,
          nombaAccountNo: true,
          owner: { select: { fullName: true } },
        },
      },
      payerInstallments: {
        where: { status: { in: ['pending', 'partial', 'overdue'] } },
        orderBy: { dueAt: 'asc' },
        take: 1,
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  const totalOwed = enrollments.reduce((sum, e) => sum + Number(e.collection.chargeAmount), 0)
  const totalPaid = enrollments.reduce((sum, e) => sum + Number(e.totalPaid), 0)
  const dueSoon = enrollments.filter((e) => {
    const next = e.payerInstallments[0]
    if (!next) return false
    return (next.dueAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7
  }).length

  const stats: { label: string; value: number; format: 'number' | 'currency' }[] = [
    { label: 'Total paid', value: totalPaid, format: 'currency' },
    { label: 'Total owed', value: totalOwed, format: 'currency' },
    { label: 'Collections', value: enrollments.length, format: 'number' },
    { label: 'Due soon', value: dueSoon, format: 'number' },
  ]

  return (
    <div className="relative min-h-screen">
      <TopNav variant="payer" userName={session.user.name ?? 'there'} />
      <AutoRefresh />

      <Image
        src="/paybook-logo-full.png"
        alt=""
        aria-hidden="true"
        width={480}
        height={200}
        className="pointer-events-none fixed top-1/2 left-1/2 z-0 w-[480px] max-w-[62vw] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
      />

      <main className="relative z-10 mx-auto max-w-[820px] px-6 py-8 pb-20">
        {!session.user.emailVerified && <EmailVerificationBanner />}
        <h1 className="mb-1 text-[25px] font-extrabold tracking-tight">
          Hi {(session.user.name ?? 'there').split(' ')[0]} 👋
        </h1>
        <p className="mb-6 text-[15px] text-text-muted">Here&apos;s what you owe and where to pay.</p>

        <div className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {stats.map((st, i) => (
            <div key={st.label} className="animate-card-in rounded-[15px] bg-card p-4 opacity-0 shadow-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="mb-1.5 text-xs text-text-muted">{st.label}</div>
              <div className="text-xl font-extrabold tracking-tight tabular-nums">
                <AnimatedCounter value={st.value} format={st.format} />
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-3.5 text-lg font-extrabold">My Collections</h2>

        {enrollments.length === 0 ? (
          <div className="rounded-card bg-card p-12 text-center shadow-card">
            <p className="mb-4 text-4xl">🔍</p>
            <h2 className="mb-2 text-lg font-extrabold">No active collections</h2>
            <p className="text-sm text-text-muted">
              You haven&apos;t joined any collections yet. Ask your collection owner for an invite link.
            </p>
          </div>
        ) : (
          <div className="grid gap-3.5">
            {enrollments.map((e, i) => {
              const next = e.payerInstallments[0]
              const fill = Math.min(100, (Number(e.totalPaid) / Number(e.collection.chargeAmount)) * 100)
              const { tone } = toneForStatus(e.status)

              return (
                <Link
                  key={e.id}
                  href={`/payer/collections/${e.collection.id}`}
                  className="animate-card-in block rounded-card bg-card p-[22px] opacity-0 shadow-card transition-all hover:-translate-y-[3px] hover:shadow-card-hover"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="mb-3.5 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="mb-0.5 text-[16.5px] font-extrabold">{e.collection.name}</h3>
                      <p className="text-[13px] text-text-muted">by {e.collection.owner.fullName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge label={e.status.replace('_', ' ')} tone={tone} />
                      {next && (
                        <StatusBadge label={`Due ${formatDate(next.dueAt).split(',')[0]}`} tone={urgencyTone(next.dueAt, next.status)} />
                      )}
                    </div>
                  </div>

                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-text-muted">Paid</span>
                    <span className="font-mono font-bold">
                      {formatNGN(Number(e.totalPaid))}{' '}
                      <span className="font-medium text-text-faint">/ {formatNGN(Number(e.collection.chargeAmount))}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-pill bg-fill-2">
                    <div
                      className="h-full rounded-pill bg-gradient-to-r from-green-deep to-green transition-all duration-700"
                      style={{ width: `${fill}%` }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
