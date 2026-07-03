import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashToken } from '@/lib/tokens'
import { z } from 'zod'

const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown
    const parsed = verifyEmailSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
    })

    if (!record || record.purpose !== 'email_verification' || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This verification link is invalid or has expired.' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
      prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Email verification error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
