import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Owner manually revokes an invite link ahead of its 24-hour expiry —
// isLinkValid() everywhere else respects isActive, so this takes effect
// immediately for anyone holding the URL.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: collectionId, linkId } = await params

  const link = await prisma.inviteLink.findFirst({
    where: { id: linkId, collectionId, collection: { ownerId: session.user.id } },
  })

  if (!link) {
    return NextResponse.json({ error: 'Invite link not found' }, { status: 404 })
  }

  if (!link.isActive) {
    return NextResponse.json({ error: 'This link is already revoked' }, { status: 400 })
  }

  const updated = await prisma.inviteLink.update({
    where: { id: linkId },
    data: { isActive: false, revokedAt: new Date() },
  })

  return NextResponse.json({ link: updated })
}
