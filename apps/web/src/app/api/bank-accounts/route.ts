import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createBankAccountSchema = z.object({
  bankName: z.string().min(1),
  bankCode: z.string().min(1),
  accountNumber: z.string().min(10).max(10),
  accountName: z.string().min(1),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ accounts })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as unknown
  const parsed = createBankAccountSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { bankName, bankCode, accountNumber, accountName } = parsed.data
  const userId = session.user.id

  const account = await prisma.bankAccount.upsert({
    where: { accountNumber_bankCode_userId: { accountNumber, bankCode, userId } },
    update: {},
    create: { userId, bankName, bankCode, accountNumber, accountName },
  })

  return NextResponse.json({ account }, { status: 201 })
}
