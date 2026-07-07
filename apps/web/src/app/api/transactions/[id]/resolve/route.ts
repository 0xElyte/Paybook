import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity } from '@paybook/db/activity'
import { z } from 'zod'

const resolveSchema = z.object({
  action: z.enum(['accept', 'refund']),
})

// Owner resolutions for an unmatched transfer that will never bind to a payer:
// - accept: keep the money without attributing it to anyone (one-time sender,
//   or someone who doesn't want to join Paybook)
// - refund: record that the money was/will be returned to the sender — the
//   actual transfer happens outside Paybook (owner's Nomba dashboard / bank app)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: transactionId } = await params

  const parsed = resolveSchema.safeParse((await req.json()) as unknown)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { collection: { select: { ownerId: true } } },
  })

  if (!transaction || transaction.collection.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  if (transaction.matchStatus !== 'unmatched') {
    return NextResponse.json({ error: 'This transfer has already been resolved' }, { status: 400 })
  }

  const newStatus = parsed.data.action === 'accept' ? ('accepted' as const) : ('refunded' as const)

  // Guard on the current status inside the update so a concurrent match/resolve
  // can't double-apply (updateMany returns count instead of throwing).
  const updated = await prisma.transaction.updateMany({
    where: { id: transactionId, matchStatus: 'unmatched' },
    data: { matchStatus: newStatus },
  })

  if (updated.count === 0) {
    return NextResponse.json({ error: 'This transfer has already been resolved' }, { status: 400 })
  }

  const amountNGN = Number(transaction.amount)
  await logActivity(prisma, {
    collectionId: transaction.collectionId,
    type: newStatus === 'accepted' ? 'transfer_accepted' : 'transfer_refunded',
    message:
      newStatus === 'accepted'
        ? `Owner accepted the ₦${amountNGN.toLocaleString()} transfer from ${transaction.senderName} (${transaction.senderAccountNumber}) without matching it to a payer`
        : `Owner marked the ₦${amountNGN.toLocaleString()} transfer from ${transaction.senderName} (${transaction.senderAccountNumber}) as refunded`,
    actorId: session.user.id,
    referenceId: transaction.id,
  })

  return NextResponse.json({ success: true, matchStatus: newStatus })
}
