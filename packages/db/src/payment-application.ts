import type { Decimal } from '@prisma/client/runtime/library'
import { prisma } from './index'

// Shared between the webhook handler (automatic matching) and the owner's
// manual-assign action (unmatched transactions) — both need identical
// installment/balance application logic, including the overpayment cascade.

export type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export interface EnrollmentWithInstallments {
  id: string
  payerId: string
  collectionId: string
  totalPaid: Decimal
  creditBalance: Decimal
  payerInstallments: Array<{
    id: string
    amountDue: Decimal
    amountPaid: Decimal
    status: string
  }>
}

export interface CollectionShape {
  repaymentType: string
  chargeAmount: Decimal
}

export async function applyPayment(
  tx: PrismaTx,
  enrollment: EnrollmentWithInstallments,
  collection: CollectionShape,
  amountNGN: number
): Promise<boolean> {
  if (collection.repaymentType === 'installment') {
    return applyToInstallments(tx, enrollment, amountNGN)
  }
  return applyToBalance(tx, enrollment, collection, amountNGN)
}

async function applyToInstallments(
  tx: PrismaTx,
  enrollment: EnrollmentWithInstallments,
  amountRemaining: number
): Promise<boolean> {
  // Re-fetch current installment state inside the transaction
  const pendingInstallments = await tx.payerInstallment.findMany({
    where: {
      enrollmentId: enrollment.id,
      status: { in: ['pending', 'partial', 'overdue'] },
    },
    orderBy: { dueAt: 'asc' },
  })

  let overflow = amountRemaining
  let appliedToOverpayment = false

  for (const installment of pendingInstallments) {
    if (overflow <= 0) break

    const remaining = Number(installment.amountDue) - Number(installment.amountPaid)

    if (overflow <= remaining) {
      await tx.payerInstallment.update({
        where: { id: installment.id },
        data: {
          amountPaid: { increment: overflow },
          status: overflow === remaining ? 'paid' : 'partial',
          paidAt: overflow === remaining ? new Date() : undefined,
        },
      })
      overflow = 0
    } else {
      // This installment fully paid, overflow continues to next
      await tx.payerInstallment.update({
        where: { id: installment.id },
        data: {
          amountPaid: installment.amountDue,
          status: 'paid',
          paidAt: new Date(),
        },
      })
      overflow -= remaining
      appliedToOverpayment = true
    }
  }

  // Update enrollment total_paid
  await tx.enrollment.update({
    where: { id: enrollment.id },
    data: { totalPaid: { increment: amountRemaining - overflow } },
  })

  // Any remaining overflow with no more installments → credit balance
  if (overflow > 0) {
    await tx.enrollment.update({
      where: { id: enrollment.id },
      data: { creditBalance: { increment: overflow } },
    })
    appliedToOverpayment = true
  }

  return appliedToOverpayment
}

async function applyToBalance(
  tx: PrismaTx,
  enrollment: EnrollmentWithInstallments,
  collection: CollectionShape,
  amountNGN: number
): Promise<boolean> {
  const chargeAmount = Number(collection.chargeAmount)
  const alreadyPaid = Number(enrollment.totalPaid)
  const remaining = chargeAmount - alreadyPaid

  if (amountNGN <= remaining) {
    await tx.enrollment.update({
      where: { id: enrollment.id },
      data: { totalPaid: { increment: amountNGN } },
    })
    return false
  }

  // Overpayment — no future cycle to roll into for one_time/part_payment
  const overflow = amountNGN - remaining
  await tx.enrollment.update({
    where: { id: enrollment.id },
    data: {
      totalPaid: chargeAmount,
      creditBalance: { increment: overflow },
    },
  })
  return true
}
