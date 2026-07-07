import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createVirtualAccount } from '@/lib/nomba'
import { credentialsForOwner } from '@/lib/nomba-connection'
import { isLinkValid } from '@/lib/invite-link'
import { logActivity } from '@paybook/db/activity'
import { z } from 'zod'
import type { DurationUnit } from '@prisma/client'

// Claim-and-bind model: joining requires ONLY a valid invite token. No bank
// details are collected at enrollment — the payer's sending account binds
// automatically at their first payment (payer claim or owner assign), sourced
// from the webhook's own sender fields instead of self-declared form input.
const enrollSchema = z.object({
  inviteToken: z.string().min(1),
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

  const link = await prisma.inviteLink.findUnique({
    where: { token: parsed.data.inviteToken },
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

  if (collection.ownerId === userId) {
    return NextResponse.json({ error: 'You cannot join your own collection' }, { status: 400 })
  }

  const existingEnrollment = await prisma.enrollment.findUnique({
    where: { collectionId_payerId: { collectionId: collection.id, payerId: userId } },
  })

  if (existingEnrollment) {
    return NextResponse.json({ error: 'You are already enrolled in this collection' }, { status: 409 })
  }

  const joinedAt = new Date()

  const enrollment = await prisma.$transaction(async (tx) => {
    const newEnrollment = await tx.enrollment.create({
      data: {
        collectionId: collection.id,
        payerId: userId,
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

    await logActivity(tx, {
      collectionId: collection.id,
      type: 'payer_joined',
      message: `${session.user.name ?? 'A new payer'} joined via an invite link`,
      actorId: userId,
      referenceId: newEnrollment.id,
    })

    return newEnrollment
  })

  // Production strategy (NOMBA_VA_STRATEGY=per_payer): give this payer their own
  // dedicated virtual account for exact webhook attribution — no sender matching
  // needed. The sandbox caps VAs at 2 per account holder, so the hackathon runs
  // the shared strategy (this block skipped) with claim-and-bind as the matcher.
  // Best-effort: if provisioning fails, the payer still pays into the
  // Collection's shared account and claim-and-bind covers them.
  let payerAccount: { nombaAccountNo: string; nombaBankName: string } | null = null
  if (process.env.NOMBA_VA_STRATEGY === 'per_payer') {
    try {
      // Signed with the OWNER's bound Nomba account — the payer's personal VA
      // routes into the collection owner's own money, not Paybook's.
      const creds = await credentialsForOwner(collection.ownerId)
      const account = await createVirtualAccount(
        {
          accountRef: enrollment.id,
          accountName: `Paybook - ${collection.name}`.slice(0, 64),
          subAccountId: collection.nombaSubAccountId ?? undefined,
        },
        creds
      )
      const updated = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          nombaAccountRef: enrollment.id,
          nombaAccountNo: account.bankAccountNumber,
          nombaBankName: account.bankName,
        },
      })
      payerAccount = { nombaAccountNo: updated.nombaAccountNo!, nombaBankName: updated.nombaBankName! }
    } catch (err) {
      console.error('Per-payer virtual account provisioning failed (continuing with shared account):', err)
    }
  }

  return NextResponse.json(
    {
      enrollment,
      collection: {
        id: collection.id,
        name: collection.name,
        // Payer's own VA takes precedence when provisioned (per-payer strategy)
        nombaAccountNo: payerAccount?.nombaAccountNo ?? collection.nombaAccountNo,
        nombaBankName: payerAccount?.nombaBankName ?? collection.nombaBankName,
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
