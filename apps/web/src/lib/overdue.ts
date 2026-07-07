import { prisma } from '@/lib/db'

/**
 * Read-time overdue sweep (same no-cron pattern as invite expiry and exit
 * finalization): any open installment past its due date flips to `overdue`.
 * A later partial payment moves it to `partial` again — and if it's still past
 * due, the next sweep re-flags it, which is exactly the truth.
 */
export async function markOverdueInstallments(scope?: {
  enrollmentId?: string
  collectionId?: string
  payerId?: string
  collectionOwnerId?: string
}): Promise<void> {
  await prisma.payerInstallment.updateMany({
    where: {
      status: { in: ['pending', 'partial'] },
      dueAt: { lt: new Date() },
      ...(scope?.enrollmentId ? { enrollmentId: scope.enrollmentId } : {}),
      ...(scope?.collectionId ? { enrollment: { collectionId: scope.collectionId } } : {}),
      ...(scope?.payerId ? { enrollment: { payerId: scope.payerId } } : {}),
      ...(scope?.collectionOwnerId
        ? { enrollment: { collection: { ownerId: scope.collectionOwnerId } } }
        : {}),
    },
    data: { status: 'overdue' },
  })
}
