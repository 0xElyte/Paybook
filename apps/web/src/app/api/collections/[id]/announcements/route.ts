import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const broadcastSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(1000),
  payerIds: z.array(z.string().uuid()).min(1, 'Select at least one payer'),
})

// Owner broadcast to selected payers of a Collection. Creates the Announcement
// record, per-recipient rows (read state), and an in-app Notification per
// recipient so it lands in their bell feed immediately.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: collectionId } = await params

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId, ownerId: session.user.id },
    select: { id: true, name: true, ownerId: true },
  })

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const parsed = broadcastSchema.safeParse((await req.json()) as unknown)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { body, payerIds } = parsed.data

  // Only currently-active payers of THIS collection can be recipients.
  const enrollments = await prisma.enrollment.findMany({
    where: { collectionId, status: { in: ['active', 'exit_pending'] }, payerId: { in: payerIds } },
    select: { payerId: true },
  })
  const validPayerIds = [...new Set(enrollments.map((e) => e.payerId))]

  if (validPayerIds.length === 0) {
    return NextResponse.json({ error: 'None of the selected payers are active in this collection' }, { status: 400 })
  }

  const activeCount = await prisma.enrollment.count({
    where: { collectionId, status: { in: ['active', 'exit_pending'] } },
  })

  const announcement = await prisma.$transaction(async (tx) => {
    const created = await tx.announcement.create({
      data: {
        collectionId,
        ownerId: session.user.id,
        title: `Broadcast — ${collection.name}`,
        body,
        target: validPayerIds.length === activeCount ? 'all' : 'selected',
      },
    })

    await tx.announcementRecipient.createMany({
      data: validPayerIds.map((payerId) => ({
        announcementId: created.id,
        payerId,
        notifSentAt: new Date(),
      })),
    })

    await tx.notification.createMany({
      data: validPayerIds.map((payerId) => ({
        userId: payerId,
        type: 'announcement' as const,
        title: `${collection.name} — message from the owner`,
        body,
        referenceType: 'announcement',
        referenceId: created.id,
      })),
    })

    return created
  })

  return NextResponse.json(
    { success: true, announcementId: announcement.id, recipientCount: validPayerIds.length },
    { status: 201 }
  )
}
