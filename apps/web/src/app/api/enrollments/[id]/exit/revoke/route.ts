import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity } from '@paybook/db/activity'

// Revoke a pending exit before the 7-day grace elapses. Either party can
// revoke (SCHEMA.md exit rules) — the enrollment returns to active and the
// other side is notified.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const { id: enrollmentId } = await params

  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      collection: { select: { name: true, ownerId: true } },
      payer: { select: { fullName: true } },
    },
  })

  if (!enrollment || (enrollment.payerId !== userId && enrollment.collection.ownerId !== userId)) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }

  if (enrollment.status !== 'exit_pending') {
    return NextResponse.json({ error: 'There is no pending exit to revoke' }, { status: 400 })
  }

  if (enrollment.exitDueAt && enrollment.exitDueAt <= new Date()) {
    return NextResponse.json({ error: 'The grace period has already ended' }, { status: 400 })
  }

  const revokerIsPayer = enrollment.payerId === userId

  await prisma.$transaction(async (tx) => {
    const updated = await tx.enrollment.updateMany({
      where: { id: enrollmentId, status: 'exit_pending' },
      data: { status: 'active', exitRevokedAt: new Date() },
    })
    if (updated.count === 0) return

    await tx.notification.create({
      data: {
        userId: revokerIsPayer ? enrollment.collection.ownerId : enrollment.payerId,
        type: 'exit_revoked' as const,
        title: 'Exit request revoked',
        body: revokerIsPayer
          ? `${enrollment.payer.fullName} has revoked their exit request for "${enrollment.collection.name}".`
          : `The owner of "${enrollment.collection.name}" has revoked the removal notice — you remain an active payer.`,
        referenceType: 'enrollment',
        referenceId: enrollmentId,
      },
    })

    await logActivity(tx, {
      collectionId: enrollment.collectionId,
      type: 'exit_revoked',
      message: revokerIsPayer
        ? `${enrollment.payer.fullName} revoked their exit request — they remain an active payer`
        : `Owner revoked the removal of ${enrollment.payer.fullName} — they remain an active payer`,
      actorId: userId,
      referenceId: enrollmentId,
    })
  })

  return NextResponse.json({ success: true })
}
