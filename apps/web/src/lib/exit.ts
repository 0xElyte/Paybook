import { prisma } from '@/lib/db'

export const EXIT_GRACE_DAYS = 7

/**
 * Lazy finalization sweep (no cron in the MVP, same pattern as invite-link
 * expiry): any exit_pending enrollment whose 7-day grace window has elapsed
 * without a revoke is finalized — `exited` if the payer asked, `removed` if
 * the owner did — and both parties are notified. Called from dashboard and
 * detail page loads, so state is always correct by the time anyone looks.
 */
export async function finalizeDueExits(scope?: {
  collectionId?: string
  payerId?: string
  collectionOwnerId?: string
}): Promise<void> {
  const due = await prisma.enrollment.findMany({
    where: {
      status: 'exit_pending',
      exitRevokedAt: null,
      exitDueAt: { lte: new Date() },
      ...(scope?.collectionId ? { collectionId: scope.collectionId } : {}),
      ...(scope?.payerId ? { payerId: scope.payerId } : {}),
      ...(scope?.collectionOwnerId ? { collection: { ownerId: scope.collectionOwnerId } } : {}),
    },
    include: {
      collection: { select: { name: true, ownerId: true } },
      payer: { select: { fullName: true } },
    },
  })

  for (const enrollment of due) {
    const finalStatus = enrollment.exitRequestedBy === 'owner' ? 'removed' : 'exited'

    await prisma.$transaction(async (tx) => {
      // Guard inside the transaction — another request may have finalized or
      // revoked this enrollment between the sweep query and now.
      const updated = await tx.enrollment.updateMany({
        where: { id: enrollment.id, status: 'exit_pending', exitRevokedAt: null },
        data: { status: finalStatus, exitedAt: new Date() },
      })
      if (updated.count === 0) return

      await tx.notification.createMany({
        data: [
          {
            userId: enrollment.collection.ownerId,
            type: 'exit_finalized' as const,
            title: 'Exit finalized',
            body: `${enrollment.payer.fullName} is no longer a payer in "${enrollment.collection.name}" — the 7-day grace period ended without a revoke.`,
            referenceType: 'enrollment',
            referenceId: enrollment.id,
          },
          {
            userId: enrollment.payerId,
            type: 'exit_finalized' as const,
            title: 'Exit finalized',
            body: `You have been disconnected from "${enrollment.collection.name}". Your payment history remains on record.`,
            referenceType: 'enrollment',
            referenceId: enrollment.id,
          },
        ],
      })
    })
  }
}

/**
 * "Outstanding" for exit purposes = anything currently DUE and unpaid (PRD:
 * "fully paid up to date"). Future installments / an unfinished cycle that
 * hasn't reached its due date yet don't block a payer's exit request.
 */
export async function payerHasOutstanding(enrollmentId: string): Promise<{ outstanding: boolean; amount: number }> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      collection: { select: { repaymentType: true, chargeAmount: true, durationValue: true, durationUnit: true } },
      payerInstallments: {
        where: { status: { in: ['pending', 'partial', 'overdue'] }, dueAt: { lte: new Date() } },
      },
    },
  })
  if (!enrollment) return { outstanding: false, amount: 0 }

  if (enrollment.collection.repaymentType === 'installment') {
    const amount = enrollment.payerInstallments.reduce(
      (sum, pi) => sum + (Number(pi.amountDue) - Number(pi.amountPaid)),
      0
    )
    return { outstanding: amount > 0, amount }
  }

  // one_time / part_payment: the balance is only "due" once the cycle
  // (joinedAt + duration) has elapsed.
  const cycleEnd = addDuration(enrollment.joinedAt, enrollment.collection.durationValue, enrollment.collection.durationUnit)
  const remaining = Math.max(0, Number(enrollment.collection.chargeAmount) - Number(enrollment.totalPaid))
  if (cycleEnd > new Date()) return { outstanding: false, amount: remaining }
  return { outstanding: remaining > 0, amount: remaining }
}

function addDuration(from: Date, value: number, unit: string): Date {
  const date = new Date(from)
  switch (unit) {
    case 'days':
      date.setDate(date.getDate() + value)
      break
    case 'weeks':
      date.setDate(date.getDate() + value * 7)
      break
    case 'months':
      date.setMonth(date.getMonth() + value)
      break
    case 'years':
      date.setFullYear(date.getFullYear() + value)
      break
  }
  return date
}
