import Link from 'next/link'
import Image from 'next/image'
import { Plus, UserPlus2, ArrowUpRight } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatNGN } from '@/lib/utils'
import { TopNav } from '@/components/chrome/top-nav'
import { EmailVerificationBanner } from '@/components/chrome/email-verification-banner'
import { AnimatedCounter } from '@/components/ui/animated-counter'
import { MonoAccountNumber } from '@/components/ui/mono-account-number'
import { StatusBadge } from '@/components/ui/status-badge'

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function HomePage() {
  const session = await auth()
  const userId = session?.user?.id

  const collections = userId
    ? await prisma.collection.findMany({
        where: { ownerId: userId },
        include: {
          enrollments: { where: { status: 'active' }, select: { id: true } },
          transactions: { where: { matchStatus: 'matched' }, select: { amount: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const totalCollections = collections.length
  const totalCollected = collections.reduce(
    (sum, c) => sum + c.transactions.reduce((s, tx) => s + Number(tx.amount), 0),
    0
  )
  const activePayers = collections.reduce((sum, c) => sum + c.enrollments.length, 0)

  const enrollmentsForOutstanding = userId
    ? await prisma.enrollment.findMany({
        where: { status: 'active', collection: { ownerId: userId } },
        select: { totalPaid: true, collection: { select: { chargeAmount: true } } },
      })
    : []
  const outstanding = enrollmentsForOutstanding.reduce(
    (sum, e) => sum + Math.max(0, Number(e.collection.chargeAmount) - Number(e.totalPaid)),
    0
  )

  const recentActivity = userId
    ? await prisma.transaction.findMany({
        where: { matchStatus: 'matched', collection: { ownerId: userId } },
        orderBy: { paidAt: 'desc' },
        take: 6,
        include: {
          collection: { select: { name: true } },
          enrollment: { select: { payer: { select: { fullName: true } } } },
        },
      })
    : []

  const stats: { label: string; value: number; format: 'number' | 'currency' }[] = [
    { label: 'Total collections', value: totalCollections, format: 'number' },
    { label: 'Total collected', value: totalCollected, format: 'currency' },
    { label: 'Active payers', value: activePayers, format: 'number' },
    { label: 'Outstanding', value: outstanding, format: 'currency' },
  ]

  const latestCollectionId = collections[0]?.id

  return (
    <div className="relative min-h-screen">
      <TopNav variant="owner" userName={session?.user?.name ?? 'there'} activeHref="/" />

      <Image
        src="/paybook-logo-full.png"
        alt=""
        aria-hidden="true"
        width={480}
        height={200}
        className="pointer-events-none fixed top-1/2 left-1/2 z-0 w-[480px] max-w-[62vw] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
      />

      <main className="relative z-10 mx-auto max-w-[1180px] px-8 py-8 pb-20">
        {!session?.user?.emailVerified && <EmailVerificationBanner />}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-1 text-[27px] font-extrabold tracking-tight">
              Good {greeting()}, {(session?.user?.name ?? 'there').split(' ')[0]}
            </h1>
            <p className="text-[15px] text-text-muted">Here&apos;s how your collections are doing today.</p>
          </div>
          <div className="flex gap-3">
            {latestCollectionId && (
              <Link
                href={`/collections/${latestCollectionId}`}
                className="flex h-11 items-center gap-2 rounded-control border-[1.5px] border-border bg-card px-[18px] text-[14.5px] font-bold text-navy transition-all hover:scale-[1.02] hover:shadow-[0_8px_20px_rgba(15,28,63,0.08)] active:scale-[0.97]"
              >
                <UserPlus2 size={17} />
                Invite link
              </Link>
            )}
            <Link
              href="/collections/new"
              className="shadow-green-cta flex h-11 items-center gap-2 rounded-control bg-green px-5 text-[14.5px] font-extrabold text-navy transition-all hover:scale-[1.02] hover:shadow-[0_12px_28px_rgba(0,217,126,0.45)] active:scale-[0.97]"
            >
              <Plus size={18} strokeWidth={2.4} />
              New Collection
            </Link>
          </div>
        </div>

        <div className="mb-7 grid grid-cols-2 gap-[18px] lg:grid-cols-4">
          {stats.map((st, i) => (
            <div
              key={st.label}
              className="animate-card-in rounded-card bg-card p-5 opacity-0 shadow-card"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="mb-3.5 text-[13px] font-semibold text-text-muted">{st.label}</div>
              <div className="mb-1.5 text-[27px] font-extrabold tracking-tight tabular-nums">
                <AnimatedCounter value={st.value} format={st.format} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Your Collections</h2>
              <span className="text-[13px] text-text-muted">{totalCollections} total</span>
            </div>

            {collections.length === 0 ? (
              <div className="rounded-card border border-dashed border-border bg-card p-12 text-center">
                <p className="text-sm text-text-muted">You haven&apos;t created any collections yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {collections.map((collection, i) => {
                  const collected = collection.transactions.reduce((s, tx) => s + Number(tx.amount), 0)
                  const target = Number(collection.chargeAmount) * Math.max(1, collection.enrollments.length)
                  const pct = target > 0 ? Math.min(100, (collected / target) * 100) : 0

                  return (
                    <Link
                      key={collection.id}
                      href={`/collections/${collection.id}`}
                      className="animate-card-in group block rounded-card bg-card p-[22px] opacity-0 shadow-card transition-all hover:-translate-y-[3px] hover:shadow-card-hover"
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="mb-2 text-[17px] font-extrabold">{collection.name}</h3>
                          {collection.nombaAccountNo ? (
                            <div className="flex items-center gap-2 text-text-2">
                              <MonoAccountNumber accountNumber={collection.nombaAccountNo} size="sm" />
                              <span className="text-xs text-text-faint">· {collection.nombaBankName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-text">No virtual account</span>
                          )}
                        </div>
                        <StatusBadge
                          label={collection.status}
                          tone={collection.status === 'active' ? 'green' : 'gray'}
                          className="shrink-0"
                        />
                      </div>

                      <div className="mb-1.5 flex justify-between text-[13px]">
                        <span className="text-text-muted">Collected</span>
                        <span className="font-bold">
                          {formatNGN(collected)}{' '}
                          <span className="font-medium text-text-faint">/ {formatNGN(target)}</span>
                        </span>
                      </div>
                      <div className="mb-3.5 h-2 overflow-hidden rounded-pill bg-fill-2">
                        <div
                          className="h-full rounded-pill bg-gradient-to-r from-green-deep to-green transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>{collection.enrollments.length} payers</span>
                        <span className="text-text-faint">{collection.repaymentType.replace('_', ' ')}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-card bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <span className="animate-pulse-badge h-2 w-2 rounded-full bg-green" />
              <h2 className="text-base font-extrabold">Recent activity</h2>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-[13px] text-text-muted">No payments matched yet.</p>
            ) : (
              <div className="grid gap-1">
                {recentActivity.map((tx, i) => (
                  <div
                    key={tx.id}
                    className="animate-card-in flex items-center gap-3 rounded-[11px] p-2 opacity-0"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fill text-[13px] font-bold text-text-2">
                      {(tx.enrollment?.payer.fullName ?? tx.senderName).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold">
                        {tx.enrollment?.payer.fullName ?? tx.senderName}
                      </div>
                      <div className="truncate text-xs text-text-muted">
                        {tx.collection.name} · {timeAgo(tx.paidAt)}
                      </div>
                    </div>
                    <span className="flex items-center gap-0.5 font-mono text-[13px] font-bold text-green-text">
                      <ArrowUpRight size={12} />+{formatNGN(Number(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
