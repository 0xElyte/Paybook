import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/utils'
import { z } from 'zod'

const createInviteLinkSchema = z.object({
  maxUses: z.number().int().positive().nullable(), // null = "Any" (unlimited)
})

// ─── POST /api/collections/[id]/invite-links ──────────────────────────────────

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: collectionId } = await params

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId, ownerId: session.user.id },
  })

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  if (collection.status !== 'active') {
    return NextResponse.json({ error: 'Collection is not active' }, { status: 400 })
  }

  const body = (await req.json()) as unknown
  const parsed = createInviteLinkSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { maxUses } = parsed.data

  const token = generateToken(32)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // always 24 hours

  const inviteLink = await prisma.inviteLink.create({
    data: {
      collectionId,
      token,
      maxUses,
      expiresAt,
      createdById: session.user.id,
    },
  })

  return NextResponse.json({ link: inviteLink }, { status: 201 })
}

// ─── GET /api/collections/[id]/invite-links ───────────────────────────────────

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: collectionId } = await params

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId, ownerId: session.user.id },
  })

  if (!collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
  }

  const links = await prisma.inviteLink.findMany({
    where: { collectionId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ links })
}
