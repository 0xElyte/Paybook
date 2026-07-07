import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encryptSecret } from '@/lib/crypto'
import { issueToken } from '@/lib/nomba'
import { z } from 'zod'

const connectSchema = z.object({
  accountId: z.string().min(8).max(80),
  clientId: z.string().min(8).max(120),
  clientSecret: z.string().min(8).max(200),
  subAccountId: z.string().min(8).max(80),
})

// Bind the owner's own Nomba business account. Credentials are validated with
// a LIVE token issuance before anything is stored — a typo'd secret never
// enters the database. The secret is AES-256-GCM encrypted at rest and is
// never returned by any endpoint or written to any log.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as unknown
  const parsed = connectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'All four Nomba credential fields are required' }, { status: 400 })
  }

  const { accountId, clientId, clientSecret, subAccountId } = parsed.data

  try {
    await issueToken({ accountId, clientId, clientSecret, subAccountId })
  } catch {
    return NextResponse.json(
      { error: 'Nomba rejected these credentials. Check the account ID, client ID and client secret in your Nomba dashboard.' },
      { status: 422 }
    )
  }

  // Credentials are valid at this point — anything that fails below is OUR
  // configuration/storage problem, not the owner's. Never let it surface as a
  // bare 500: say so, and log the real cause for the server operator.
  let secretEnc: string
  try {
    secretEnc = encryptSecret(clientSecret)
  } catch (err) {
    console.error('nomba-connection: encryption failed (check PAYBOOK_ENCRYPTION_KEY):', err)
    return NextResponse.json(
      { error: 'Your credentials are valid, but the server could not store them securely. This is a Paybook configuration issue — contact support.' },
      { status: 500 }
    )
  }

  // JWT sessions can outlive their User row (e.g. after a data reset) — verify
  // the account still exists before writing anything keyed on it.
  const userExists = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
  if (!userExists) {
    return NextResponse.json(
      { error: 'Your login session is no longer valid. Please log out and sign in (or register) again.' },
      { status: 401 }
    )
  }

  try {
    const connection = await prisma.nombaConnection.upsert({
      where: { ownerId: session.user.id },
      update: { accountId, clientId, clientSecretEnc: secretEnc, subAccountId },
      create: { ownerId: session.user.id, accountId, clientId, clientSecretEnc: secretEnc, subAccountId },
    })
    return NextResponse.json({ linked: true, accountId: mask(connection.accountId) }, { status: 201 })
  } catch (err) {
    console.error('nomba-connection: failed to persist connection:', err)
    return NextResponse.json(
      { error: 'Your credentials are valid, but saving the connection failed. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connection = await prisma.nombaConnection.findUnique({
    where: { ownerId: session.user.id },
    select: { accountId: true, subAccountId: true, createdAt: true },
  })

  if (!connection) return NextResponse.json({ linked: false })

  return NextResponse.json({
    linked: true,
    accountId: mask(connection.accountId),
    subAccountId: mask(connection.subAccountId),
    linkedAt: connection.createdAt,
  })
}

function mask(value: string): string {
  if (value.length <= 8) return '••••'
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}
