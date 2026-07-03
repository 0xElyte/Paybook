import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { phoneSchema } from '@/lib/validations/phone'
import { generateToken, hashToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@/lib/email'

const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: phoneSchema,
  password: z.string().min(8).max(100),
})

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { fullName, email, phone, password } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        phone,
        passwordHash,
        role: 'payer', // default; a role becomes 'owner'/'both' once they create a Collection
      },
    })

    // Verification is informational only — the account is usable immediately.
    // Don't let an email-sending failure block registration.
    try {
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
    } catch (err) {
      console.error('Failed to send verification email:', err)
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
