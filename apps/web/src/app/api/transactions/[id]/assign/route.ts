import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { applyPayment } from '@paybook/db/payment-application'
import { z } from 'zod'

const assignSchema = z.object({
  enrollmentId: z.string().uuid(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: transactionId } = await params

  const body = (await req.json()) as unknown
  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { collection: true },
  })

  if (!transaction || transaction.collection.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  if (transaction.matchStatus !== 'unmatched') {
    return NextResponse.json({ error: 'This transaction is already matched' }, { status: 400 })
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: parsed.data.enrollmentId,
      collectionId: transaction.collectionId,
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
    return NextResponse.json({ error: 'Payer not found in this collection' }, { status: 404 })
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

    await tx.notification.createMany({
      data: [
        {
          userId: transaction.collection.ownerId,
          type: 'payment_received',
          title: 'Payment manually assigned',
          body: `₦${amountNGN.toLocaleString()} in ${transaction.collection.name} was manually assigned to a payer`,
          referenceType: 'enrollment',
          referenceId: enrollment.id,
        },
        {
          userId: enrollment.payerId,
          type: 'payment_received',
          title: 'Payment confirmed',
          body: `Your payment of ₦${amountNGN.toLocaleString()} to ${transaction.collection.name} has been received`,
          referenceType: 'enrollment',
          referenceId: enrollment.id,
        },
      ],
    })
  })

  return NextResponse.json({ success: true })
}
