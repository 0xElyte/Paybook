import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateToken, hashToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/email'

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.emailVerified) {
    return NextResponse.json({ error: 'Email is already verified' }, { status: 400 })
  }

  // Invalidate prior unused links so only the newest one works.
  await prisma.verificationToken.updateMany({
    where: { userId: user.id, purpose: 'email_verification', usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = generateToken()
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      purpose: 'email_verification',
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  })
  await sendVerificationEmail(user.email, user.fullName, token)

  return NextResponse.json({ success: true })
}
