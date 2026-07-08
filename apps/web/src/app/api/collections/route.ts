import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createVirtualAccount } from '@/lib/nomba'
import { credentialsForOwner } from '@/lib/nomba-connection'
import { collectionSchema } from '@/lib/validations/collection'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = (await req.json()) as unknown
  const parsed = collectionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    )
  }

  const { name, description, chargeAmount, durationValue, durationUnit, repaymentType, installments, nombaSubAccountId } =
    parsed.data

  // JWT sessions can outlive their User row (e.g. after a data reset) — check
  // before creating anything keyed on the owner, or the collection insert dies
  // on an FK violation AFTER the virtual account has already been provisioned.
  const userExists = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
  if (!userExists) {
    return NextResponse.json(
      { error: 'Your login session is no longer valid. Please log out and sign in (or register) again.' },
      { status: 401 }
    )
  }

  // Production model: the owner's own bound Nomba account signs the virtual
  // account creation, so payments land with them. Binding is required before
  // creating a Collection (env credentials only back pre-binding demo rows).
  const connection = await prisma.nombaConnection.findUnique({ where: { ownerId: session.user.id } })
  if (!connection && process.env.NOMBA_REQUIRE_CONNECTION !== 'false') {
    return NextResponse.json(
      { error: 'Link your Nomba account before creating a collection', code: 'NOMBA_NOT_LINKED' },
      { status: 428 }
    )
  }

  const collectionId = randomUUID() // generated up front so it can double as the Nomba accountRef

  let collection
  try {
    collection = await prisma.$transaction(
      async (tx) => {
        const created = await tx.collection.create({
          data: {
            id: collectionId,
            ownerId: session.user.id,
            name,
            description,
            chargeAmount,
            durationValue,
            durationUnit,
            repaymentType,
            nombaAccountRef: collectionId,
            nombaSubAccountId: nombaSubAccountId ?? null,
          },
        })

        if (repaymentType === 'installment' && installments) {
          await tx.installment.createMany({
            data: installments.map((installment, index) => ({
              collectionId: created.id,
              sequenceIndex: index,
              percentage: installment.percentage,
              dueAfterValue: installment.dueAfterValue,
              dueAfterUnit: installment.dueAfterUnit,
            })),
          })
        }

        // First collection an owner creates flips their role from the 'payer' default.
        if (session.user.role === 'payer') {
          await tx.user.update({ where: { id: session.user.id }, data: { role: 'both' } })
        }

        return created
      },
      { maxWait: 8000, timeout: 15000 }
    )
  } catch (err) {
    console.error('Collection creation transaction failed:', err)
    return NextResponse.json(
      { error: 'Could not save the collection. Please try again.' },
      { status: 500 }
    )
  }

  try {
    const creds = await credentialsForOwner(session.user.id)
    const account = await createVirtualAccount(
      {
        accountRef: collectionId,
        accountName: `Paybook - ${name}`.slice(0, 64),
        subAccountId: nombaSubAccountId, // per-Collection pocket override, if provided
      },
      creds
    )

    const updated = await prisma.collection.update({
      where: { id: collectionId },
      data: {
        nombaAccountNo: account.bankAccountNumber,
        nombaBankName: account.bankName,
      },
    })

    return NextResponse.json({ collection: updated }, { status: 201 })
  } catch (err) {
    // Nomba call failed — don't leave an orphaned Collection with no virtual account.
    await prisma.installment.deleteMany({ where: { collectionId } })
    await prisma.collection.delete({ where: { id: collectionId } })

    console.error('createVirtualAccount failed during collection creation:', err)
    return NextResponse.json(
      { error: 'Could not create the virtual account for this collection. Please try again.' },
      { status: 502 }
    )
  }
}
