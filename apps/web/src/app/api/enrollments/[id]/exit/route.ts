import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { payerHasOutstanding, EXIT_GRACE_DAYS } from '@/lib/exit'

// Start an exit: the payer requesting to leave, or the owner removing a payer.
// Either way a 7-day grace window opens, the other party is notified, and the
// request can be revoked any time before it elapses (see ./revoke).
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
      collection: { select: { id: true, name: true, ownerId: true } },
      payer: { select: { fullName: true } },
    },
  })

  if (!enrollment) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }

  const isPayer = enrollment.payerId === userId
  const isOwner = enrollment.collection.ownerId === userId
  if (!isPayer && !isOwner) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }

  if (enrollment.status !== 'active') {
    return NextResponse.json(
      { error: enrollment.status === 'exit_pending' ? 'An exit request is already in progress' : 'This enrollment is no longer active' },
      { status: 400 }
    )
  }

  // A payer can only request an exit when fully paid up to date. Owner-initiated
  // removal is never blocked by balance — the unresolved amount is surfaced in
  // the UI instead (PRD 5.9).
  if (isPayer) {
    const { outstanding, amount } = await payerHasOutstanding(enrollmentId)
    if (outstanding) {
      return NextResponse.json(
        { error: `You still owe ₦${amount.toLocaleString()} that is currently due. Settle it before requesting an exit.` },
        { status: 400 }
      )
    }
  }

  const now = new Date()
  const exitDueAt = new Date(now.getTime() + EXIT_GRACE_DAYS * 24 * 60 * 60 * 1000)
  const initiator = isPayer ? ('payer' as const) : ('owner' as const)

  await prisma.$transaction(async (tx) => {
    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'exit_pending',
        exitRequestedBy: initiator,
        exitRequestedAt: now,
        exitDueAt,
        exitRevokedAt: null,
        exitedAt: null,
      },
    })

    // Notify the OTHER party (the initiator just did it themselves).
    await tx.notification.create({
      data: isPayer
        ? {
            userId: enrollment.collection.ownerId,
            type: 'exit_request' as const,
            title: 'Exit request',
            body: `${enrollment.payer.fullName} has requested to leave "${enrollment.collection.name}". It finalizes automatically in ${EXIT_GRACE_DAYS} days unless revoked.`,
            referenceType: 'enrollment',
            referenceId: enrollmentId,
          }
        : {
            userId: enrollment.payerId,
            type: 'exit_request' as const,
            title: 'Removal notice',
            body: `The owner of "${enrollment.collection.name}" has initiated your removal. It finalizes automatically in ${EXIT_GRACE_DAYS} days unless revoked.`,
            referenceType: 'enrollment',
            referenceId: enrollmentId,
          },
    })
  })

  return NextResponse.json({ success: true, exitDueAt })
}
