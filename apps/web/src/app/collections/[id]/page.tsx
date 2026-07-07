import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CollectionDetailClient } from '@/components/owner/collection-detail-client'
import { finalizeDueExits } from '@/lib/exit'
import { markOverdueInstallments } from '@/lib/overdue'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const col = await prisma.collection.findUnique({ where: { id }, select: { name: true } })
  return { title: col ? col.name : 'Collection' }
}

export default async function CollectionDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  // Lazy sweep: finalize any elapsed exit grace periods in this collection.
  await Promise.all([finalizeDueExits({ collectionId: id }), markOverdueInstallments({ collectionId: id })])

  const collection = await prisma.collection.findUnique({
    where: { id, ownerId: userId },
    include: {
      installments: { orderBy: { sequenceIndex: 'asc' } },
      inviteLinks: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      enrollments: {
        where: { status: { in: ['active', 'exit_pending'] } },
        include: {
          payer: { select: { fullName: true, email: true, phone: true } },
          bankAccount: { select: { accountNumber: true, bankName: true } },
          payerInstallments: {
            where: { status: { in: ['pending', 'partial', 'overdue'] } },
            orderBy: { dueAt: 'asc' },
            take: 5,
          },
          _count: { select: { transactions: true } },
        },
      },
      transactions: {
        orderBy: { paidAt: 'desc' },
        take: 20,
        include: {
          enrollment: {
            select: { payer: { select: { fullName: true } } },
          },
        },
      },
    },
  })

  if (!collection) notFound()

  return (
    <CollectionDetailClient
      ownerName={session.user.name ?? 'there'}
      collection={{
        id: collection.id,
        name: collection.name,
        description: collection.description,
        chargeAmount: Number(collection.chargeAmount),
        durationValue: collection.durationValue,
        durationUnit: collection.durationUnit,
        repaymentType: collection.repaymentType,
        status: collection.status,
        nombaAccountNo: collection.nombaAccountNo,
        nombaBankName: collection.nombaBankName,
      }}
      inviteLinks={collection.inviteLinks.map((l) => ({
        id: l.id,
        token: l.token,
        maxUses: l.maxUses,
        usedCount: l.usedCount,
        expiresAt: l.expiresAt.toISOString(),
        isActive: l.isActive,
        createdAt: l.createdAt.toISOString(),
      }))}
      enrollments={collection.enrollments.map((e) => ({
        id: e.id,
        payerId: e.payerId,
        status: e.status,
        exitDueAt: e.exitDueAt ? e.exitDueAt.toISOString() : null,
        exitRequestedBy: e.exitRequestedBy,
        payerName: e.payer.fullName,
        payerEmail: e.payer.email,
        payerPhone: e.payer.phone,
        bankAccount: e.bankAccount
          ? `${e.bankAccount.bankName} — ${e.bankAccount.accountNumber}`
          : 'Links on first payment',
        joinedAt: e.joinedAt.toISOString(),
        totalPaid: Number(e.totalPaid),
        creditBalance: Number(e.creditBalance),
        transactionCount: e._count.transactions,
        nextInstallment: e.payerInstallments[0]
          ? {
              dueAt: e.payerInstallments[0].dueAt.toISOString(),
              amountDue: Number(e.payerInstallments[0].amountDue),
              amountPaid: Number(e.payerInstallments[0].amountPaid),
              status: e.payerInstallments[0].status,
            }
          : null,
      }))}
      transactions={collection.transactions.map((tx) => ({
        id: tx.id,
        amount: Number(tx.amount),
        senderName: tx.senderName,
        senderAccountNumber: tx.senderAccountNumber,
        senderBank: tx.senderBank,
        narration: tx.narration,
        paidAt: tx.paidAt.toISOString(),
        matchStatus: tx.matchStatus,
        payerName: tx.enrollment?.payer?.fullName ?? null,
      }))}
    />
  )
}
