import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken, hashToken } from '@/lib/tokens'
import { sendPasswordResetEmail } from '@/lib/email'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim()
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    // Always return the same response whether or not the account exists —
    // don't let this endpoint reveal which emails are registered.
    if (user) {
      await prisma.verificationToken.updateMany({
        where: { userId: user.id, purpose: 'password_reset', usedAt: null },
        data: { usedAt: new Date() },
      })

      const token = generateToken()
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          purpose: 'password_reset',
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
        },
      })
      await sendPasswordResetEmail(user.email, user.fullName, token)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ success: true })
  }
}
