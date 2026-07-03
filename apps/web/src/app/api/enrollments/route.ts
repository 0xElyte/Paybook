import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isLinkValid } from '@/lib/invite-link'
import { z } from 'zod'
import type { DurationUnit } from '@prisma/client'

const enrollSchema = z.object({
  inviteToken: z.string().min(1),
  bankAccountId: z.string().uuid().optional(), // use existing bank account
  // OR provide new bank account details
  bankName: z.string().optional(),
  bankCode: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = (await req.json()) as unknown
  const parsed = enrollSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { inviteToken, bankAccountId, bankName, bankCode, accountNumber, accountName } = parsed.data

  const link = await prisma.inviteLink.findUnique({
    where: { token: inviteToken },
    include: {
      collection: {
        include: { installments: { orderBy: { sequenceIndex: 'asc' } } },
      },
    },
  })

  if (!link) {
    return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
  }

  // Re-validate at completion time (not just at page-open time)
  if (!isLinkValid(link)) {
    return NextResponse.json(
      { error: 'This invite link has expired or reached its capacity' },
      { status: 410 }
    )
  }

  const collection = link.collection

  if (collection.status !== 'active') {
    return NextResponse.json({ error: 'This collection is no longer active' }, { status: 400 })
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { collectionId_payerId: { collectionId: collection.id, payerId: userId } },
  })

  if (existingEnrollment) {
    return NextResponse.json({ error: 'You are already enrolled in this collection' }, { status: 409 })
  }

  let resolvedBankAccountId: string

  if (bankAccountId) {
    const existing = await prisma.bankAccount.findFirst({
      where: { id: bankAccountId, userId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })
    }
    resolvedBankAccountId = bankAccountId
  } else {
    if (!bankName || !bankCode || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: 'Bank account details are required (bankName, bankCode, accountNumber, accountName)' },
        { status: 400 }
      )
    }

    const upsertedAccount = await prisma.bankAccount.upsert({
      where: { accountNumber_bankCode_userId: { accountNumber, bankCode, userId } },
      update: {}, // already exists — use it as-is
      create: { userId, bankName, bankCode, accountNumber, accountName },
    })

    resolvedBankAccountId = upsertedAccount.id
  }

  const joinedAt = new Date()

  const enrollment = await prisma.$transaction(async (tx) => {
    const newEnrollment = await tx.enrollment.create({
      data: {
        collectionId: collection.id,
        payerId: userId,
        bankAccountId: resolvedBankAccountId,
        joinedAt,
      },
    })

    // Generate PayerInstallment rows if installment type — full schedule upfront
    if (collection.repaymentType === 'installment' && collection.installments.length > 0) {
      const chargeAmount = Number(collection.chargeAmount)

      await tx.payerInstallment.createMany({
        data: collection.installments.map((inst) => ({
          enrollmentId: newEnrollment.id,
          installmentId: inst.id,
          dueAt: computeDueAt(joinedAt, inst.dueAfterValue, inst.dueAfterUnit),
          amountDue: (Number(inst.percentage) / 100) * chargeAmount,
        })),
      })
    }

    await tx.inviteLink.update({
      where: { id: link.id },
      data: { usedCount: { increment: 1 } },
    })

    await tx.notification.create({
      data: {
        userId: collection.ownerId,
        type: 'payer_joined',
        title: 'New payer joined',
        body: `A new payer has joined your "${collection.name}" collection`,
        referenceType: 'enrollment',
        referenceId: newEnrollment.id,
      },
    })

    return newEnrollment
  })

  // First collection a payer joins flips their role from the 'owner' default, if applicable.
  await prisma.user.updateMany({
    where: { id: userId, role: 'owner' },
    data: { role: 'both' },
  })

  return NextResponse.json(
    {
      enrollment,
      collection: {
        id: collection.id,
        name: collection.name,
        nombaAccountNo: collection.nombaAccountNo,
        nombaBankName: collection.nombaBankName,
      },
    },
    { status: 201 }
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDueAt(from: Date, value: number, unit: DurationUnit): Date {
  const date = new Date(from)
  switch (unit) {
    case 'days':
      date.setDate(date.getDate() + value)
      break
    case 'weeks':
      date.setDate(date.getDate() + value * 7)
      break
    case 'months':
      date.setMonth(date.getMonth() + value)
      break
    case 'years':
      date.setFullYear(date.getFullYear() + value)
      break
  }
  return date
}
