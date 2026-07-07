import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatNGN, formatDate } from '@/lib/utils'
import { TopNav } from '@/components/chrome/top-nav'
import { AutoRefresh } from '@/components/chrome/auto-refresh'
import { MonoAccountNumber } from '@/components/ui/mono-account-number'
import { CopyAccountButton } from '@/components/ui/copy-account-button'
import { StatusBadge, toneForStatus } from '@/components/ui/status-badge'
import { ClaimPaymentCard } from '@/components/payer/claim-payment-card'
import { PayModal } from '@/components/payer/pay-modal'
import { EnrollmentActions } from '@/components/payer/enrollment-actions'
import { finalizeDueExits } from '@/lib/exit'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const col = await prisma.collection.findUnique({ where: { id }, select: { name: true } })
  return { title: col ? col.name : 'Collection' }
}

export default async function PayerCollectionDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  // Lazy sweep: finalize any of this payer's exits whose grace period elapsed.
  await finalizeDueExits({ payerId: userId })

  const enrollment = await prisma.enrollment.findUnique({
    where: { collectionId_payerId: { collectionId: id, payerId: userId } },
    include: {
      collection: { include: { owner: { select: { fullName: true, email: true, phone: true } } } },
      bankAccount: true,
      payerInstallments: { include: { installment: true }, orderBy: { dueAt: 'asc' } },
      transactions: { orderBy: { paidAt: 'desc' }, take: 30 },
    },
  })

  if (!enrollment) notFound()
  const { collection } = enrollment

  // Unmatched payments in this collection the payer can claim as theirs
  // (claim-and-bind — see /api/transactions/[id]/claim).
  const unmatchedTransactions =
    enrollment.status === 'active'
      ? await prisma.transaction.findMany({
          where: { collectionId: collection.id, matchStatus: 'unmatched' },
          orderBy: { paidAt: 'desc' },
          take: 5,
        })
      : []

  // What's due right now: the earliest open installment's remainder, or the
  // outstanding balance for one-time / part-payment collections.
  const openInstallment = enrollment.payerInstallments.find((pi) =>
    ['pending', 'partial', 'overdue'].includes(pi.status)
  )
  const amountDue = openInstallment
    ? Number(openInstallment.amountDue) - Number(openInstallment.amountPaid)
    : collection.repaymentType === 'installment'
      ? 0
      : Math.max(0, Number(collection.chargeAmount) - Number(enrollment.totalPaid))
  const dueLabel = openInstallment
    ? `Installment ${openInstallment.installment.sequenceIndex + 1} — due ${formatDate(openInstallment.dueAt).split(',')[0]}`
    : 'Outstanding balance'

  const payAccountNumber = enrollment.nombaAccountNo ?? collection.nombaAccountNo
  const payBankName = enrollment.nombaBankName ?? collection.nombaBankName ?? 'Nomba'

  return (
    <div className="relative min-h-screen">
      <TopNav variant="payer" userName={session.user.name ?? 'there'} />
      <AutoRefresh />

      <main className="relative z-10 mx-auto max-w-[820px] px-6 py-7 pb-20">
        <Link
          href="/dashboard"
          className="mb-[18px] flex items-center gap-1.5 text-sm font-bold text-text-2 transition-colors hover:text-text"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>
        <h1 className="mb-1 text-2xl font-extrabold tracking-tight">{collection.name}</h1>
        <p className="mb-6 text-sm text-text-muted">
          by {collection.owner.fullName} · {collection.repaymentType.replace('_', ' ')}
        </p>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-5">
            <ClaimPaymentCard
              transactions={unmatchedTransactions.map((tx) => ({
                id: tx.id,
                amount: Number(tx.amount),
                senderName: tx.senderName,
                senderBank: tx.senderBank,
                senderAccountNumber: tx.senderAccountNumber,
                paidAt: tx.paidAt.toISOString(),
              }))}
            />

            {enrollment.payerInstallments.length > 0 && (
              <div className="rounded-card bg-card p-[22px] shadow-card">
                <h2 className="mb-4 text-base font-extrabold">Installment schedule</h2>
                <div className="grid">
                  {enrollment.payerInstallments.map((pi, i) => {
                    const { tone } = toneForStatus(pi.status)
                    const dotBg = pi.status === 'paid' ? '#00D97E' : pi.status === 'overdue' ? '#EF4444' : '#B9C4DA'
                    const isLast = i === enrollment.payerInstallments.length - 1
                    return (
                      <div key={pi.id} className="flex items-stretch gap-3.5">
                        <div className="flex flex-col items-center">
                          <span
                            className="z-10 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full"
                            style={{ background: dotBg }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                              <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                          {!isLast && <span className="w-0.5 flex-1 bg-border" />}
                        </div>
                        <div className="flex flex-1 items-center justify-between pb-[22px]">
                          <div>
                            <div className="text-[14.5px] font-bold">
                              Installment {pi.installment.sequenceIndex + 1} — {Number(pi.installment.percentage)}%
                            </div>
                            <div className="text-[12.5px] text-text-muted">Due {formatDate(pi.dueAt)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-bold">{formatNGN(Number(pi.amountDue))}</div>
                            <StatusBadge label={pi.status} tone={tone} pulse={pi.status === 'overdue'} className="mt-0.5" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="rounded-card bg-card p-[22px] shadow-card">
              <h2 className="mb-4 text-base font-extrabold">Payment history</h2>
              {enrollment.transactions.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-muted">No transactions yet.</p>
              ) : (
                <div className="grid gap-0.5">
                  <div className="grid grid-cols-[1fr_1fr_90px] border-b border-border px-1 pb-2.5 text-xs font-bold text-text-muted">
                    <span>Date</span>
                    <span>Amount</span>
                    <span className="text-right">Status</span>
                  </div>
                  {enrollment.transactions.map((tx) => (
                    <div key={tx.id} className="grid grid-cols-[1fr_1fr_90px] items-center border-b border-fill py-3 px-1 text-sm">
                      <span className="text-text-2">{formatDate(tx.paidAt)}</span>
                      <span className="font-mono font-bold">{formatNGN(Number(tx.amount))}</span>
                      <span className="text-right">
                        <StatusBadge label={tx.matchStatus} tone={toneForStatus(tx.matchStatus).tone} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:sticky lg:top-5">
            {payAccountNumber && enrollment.status === 'active' && (
              <PayModal
                collectionName={collection.name}
                bankName={payBankName}
                accountNumber={payAccountNumber}
                isPersonal={!!enrollment.nombaAccountNo}
                amountDue={amountDue}
                dueLabel={dueLabel}
              />
            )}

            {/* Per-payer VA takes precedence when provisioned (production strategy);
                otherwise the Collection's shared virtual account. */}
            {(enrollment.nombaAccountNo ?? collection.nombaAccountNo) && (
              <div className="rounded-card bg-gradient-to-br from-navy-tint to-navy p-[22px] text-white shadow-[0_16px_40px_rgba(15,28,63,0.3)]">
                <div className="mb-3.5 text-[11px] font-bold tracking-[0.08em] text-text-faint uppercase">
                  {enrollment.nombaAccountNo ? 'Your personal account' : 'Pay into'} ·{' '}
                  {enrollment.nombaBankName ?? collection.nombaBankName}
                </div>
                <MonoAccountNumber
                  accountNumber={(enrollment.nombaAccountNo ?? collection.nombaAccountNo)!}
                  size="md"
                  showCopy={false}
                  className="mb-3.5 text-white"
                />
                <CopyAccountButton accountNumber={(enrollment.nombaAccountNo ?? collection.nombaAccountNo)!} />
              </div>
            )}

            <div className="rounded-2xl bg-card p-[18px] shadow-card">
              <div className="mb-1 text-xs text-text-muted">Credit balance</div>
              <div className="font-mono text-xl font-extrabold text-green-text">
                {formatNGN(Number(enrollment.creditBalance))}
              </div>
            </div>

            <div className="rounded-2xl bg-card p-[18px] shadow-card">
              <div className="mb-1 text-xs text-text-muted">Your linked sending account</div>
              {enrollment.bankAccount ? (
                <>
                  <p className="text-sm font-bold">
                    {enrollment.bankAccount.bankName} — {enrollment.bankAccount.accountNumber}
                  </p>
                  <p className="text-xs text-text-muted">{enrollment.bankAccount.accountName}</p>
                </>
              ) : (
                <p className="text-[12.5px] leading-snug text-text-muted">
                  Not linked yet — it links automatically when your first payment is confirmed. Payments from that
                  account then match to you instantly.
                </p>
              )}
            </div>

            <EnrollmentActions
              enrollmentId={enrollment.id}
              collectionName={collection.name}
              status={enrollment.status}
              exitDueAt={enrollment.exitDueAt ? enrollment.exitDueAt.toISOString() : null}
              exitRequestedBy={enrollment.exitRequestedBy}
              owner={{
                name: collection.owner.fullName,
                email: collection.owner.email,
                phone: collection.owner.phone,
              }}
            />

            <div className="flex gap-2 rounded-[11px] border-l-[3px] border-green bg-green/[0.07] px-3.5 py-3.5">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="9" stroke="#04794a" strokeWidth="1.8" />
                <path d="M8 12l2.5 2.5L16 9" stroke="#04794a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[12.5px] leading-snug text-text-2">
                Any amount above what&apos;s due automatically rolls over to your next installment.
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
