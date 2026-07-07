import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// The in-app notification feed backing the bell + drawer.

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { id: true, type: true, title: true, body: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}

// Mark all as read (opening the drawer clears the badge, like most inboxes).
export async function PATCH() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  await Promise.all([
    prisma.notification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: now },
    }),
    // Keep the per-recipient announcement read state in step with the feed.
    prisma.announcementRecipient.updateMany({
      where: { payerId: session.user.id, readAt: null },
      data: { readAt: now },
    }),
  ])

  return NextResponse.json({ success: true })
}
