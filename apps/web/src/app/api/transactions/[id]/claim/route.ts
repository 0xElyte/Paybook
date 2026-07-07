import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { applyPayment } from '@paybook/db/payment-application'
import { logActivity } from '@paybook/db/activity'
import { bindSenderAccount } from '@/lib/bind-sender-account'

// Payer-side counterpart of the owner's manual-assign: "this payment was me."
// Applies the payment to the claimer's own enrollment AND binds the sender
// account from the webhook so every future transfer auto-matches. The owner is
// notified of the claim and can always re-review via their transactions tab.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const { id: transactionId } = await params

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { collection: true },
  })

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  if (transaction.matchStatus !== 'unmatched') {
    return NextResponse.json({ error: 'This payment has already been matched' }, { status: 400 })
  }

  // The claimer must be an active payer in the collection this payment landed in.
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      collectionId: transaction.collectionId,
      payerId: userId,
      status: 'active',
    },
    include: {
      payerInstallments: {
        where: { status: { in: ['pending', 'partial', 'overdue'] } },
        orderBy: { dueAt: 'asc' },
      },
    },
  })

  if (!enrollment) {
    return NextResponse.json({ error: 'You are not an active payer in this collection' }, { status: 403 })
  }

  const amountNGN = Number(transaction.amount)

  await prisma.$transaction(async (tx) => {
    const appliedToOverpayment = await applyPayment(tx, enrollment, transaction.collection, amountNGN)

    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        enrollmentId: enrollment.id,
        payerId: enrollment.payerId,
        matchStatus: 'matched',
        matchedAt: new Date(),
        appliedToOverpayment,
      },
    })

    await bindSenderAccount(tx, {
      payerId: enrollment.payerId,
      enrollmentId: enrollment.id,
      currentBankAccountId: enrollment.bankAccountId,
      senderAccountNumber: transaction.senderAccountNumber,
      senderName: transaction.senderName,
      senderBank: transaction.senderBank,
    })

    await tx.notification.createMany({
      data: [
        {
          userId: transaction.collection.ownerId,
          type: 'payment_received',
          title: 'Payment claimed by a payer',
          body: `₦${amountNGN.toLocaleString()} in ${transaction.collection.name} was claimed by ${session.user.name ?? 'a payer'}. Their sending account is now linked for automatic matching.`,
          referenceType: 'enrollment',
          referenceId: enrollment.id,
        },
        {
          userId: enrollment.payerId,
          type: 'payment_received',
          title: 'Payment confirmed',
          body: `Your payment of ₦${amountNGN.toLocaleString()} to ${transaction.collection.name} has been recorded. Future transfers from this account will match automatically.`,
          referenceType: 'enrollment',
          referenceId: enrollment.id,
        },
      ],
    })

    await logActivity(tx, {
      collectionId: transaction.collectionId,
      type: 'payment_claimed',
      message: `${session.user.name ?? 'A payer'} claimed the ₦${amountNGN.toLocaleString()} transfer from ${transaction.senderName} (${transaction.senderAccountNumber}) — "this was me"`,
      actorId: userId,
      referenceId: transaction.id,
    })
  })

  return NextResponse.json({ success: true })
}
