import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashToken } from '@/lib/tokens'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
    })

    if (!record || record.purpose !== 'password_reset' || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json({ error: 'Could not reset password' }, { status: 500 })
  }
}
