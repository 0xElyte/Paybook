import type { Request, Response } from 'express'
import { Prisma, prisma } from '@paybook/db'
import { applyPayment } from '@paybook/db/payment-application'
import { verifyNombaSignature } from '../lib/verify-signature'
import { parseFundedEvent } from '../lib/extract-funded-event'
import { logger } from '../lib/logger'

export async function handleVirtualAccountFunded(req: Request, res: Response) {
  try {
    await processWebhook(req, res)
  } catch (err) {
    // Unique-constraint violation on nombaRequestId = a concurrent duplicate
    // delivery raced past the idempotency pre-check. The payment is already
    // recorded — acknowledge so Nomba stops retrying.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      logger.info('webhook.duplicate_race', {})
      res.sendStatus(200)
      return
    }
    logger.error('webhook.processing_error', {
      error: err instanceof Error ? err.message : 'unknown error',
    })
    // Non-2xx → Nomba retries with backoff, which is what we want for a
    // transient failure (e.g. DB briefly unreachable).
    res.sendStatus(500)
  }
}

async function processWebhook(req: Request, res: Response) {
  const rawBody = req.body as Buffer
  const signature = req.header('nomba-signature') ?? req.header('nomba-sig-value')
  const timestamp = req.header('nomba-timestamp')

  // Parse before verifying: Nomba's documented signature scheme is computed over
  // specific payload fields (+ the nomba-timestamp header), not the raw body.
  let raw: unknown
  try {
    raw = JSON.parse(rawBody.toString())
  } catch {
    logger.warn('webhook.unparseable_body', { bodyPrefix: rawBody.toString().slice(0, 200) })
    res.status(400).send('invalid JSON')
    return
  }

  // ── Step 1: Verify signature — reject immediately if invalid ────────────────
  let signatureValid = false
  try {
    signatureValid = verifyNombaSignature({ rawBody, payload: raw, signature, timestamp })
  } catch (err) {
    logger.error('webhook.signature_config_error', {
      error: err instanceof Error ? err.message : 'unknown error',
    })
    res.sendStatus(500)
    return
  }

  if (!signatureValid) {
    logger.warn('webhook.signature_invalid', {
      path: req.path,
      signature: signature ? signature.slice(0, 8) + '…' : undefined,
      hasTimestamp: !!timestamp,
    })
    res.status(401).send('bad signature')
    return
  }

  const event = parseFundedEvent(raw)

  // Log the full raw payload on every delivery — this is how the first real
  // payment_success delivery gets inspected to confirm field paths
  // (see refs/docs/NOMBA_INTEGRATION.md, Section 5, outstanding checkpoint).
  logger.info('webhook.received', { eventType: event.eventType, raw })

  // CONFIRMED by Nomba support (2026-07-06): a virtual account funded via transfer
  // delivers a `payment_success` event, not `virtual_account.funded` (which doesn't
  // exist). Still accepting the legacy name too, at zero cost, in case a differently
  // -sourced payload ever uses it — see NOMBA_INTEGRATION.md Section 5.
  const ACCEPTED_EVENT_TYPES = new Set(['payment_success', 'virtual_account.funded'])
  if (!event.eventType || !ACCEPTED_EVENT_TYPES.has(event.eventType)) {
    logger.info('webhook.ignored', { eventType: event.eventType })
    res.sendStatus(200)
    return
  }

  // ── Step 2: Idempotency check ────────────────────────────────────────────────
  if (!event.requestId) {
    logger.error('webhook.missing_request_id', { eventType: event.eventType })
    res.sendStatus(200) // acknowledge but don't process
    return
  }

  const existing = await prisma.transaction.findUnique({
    where: { nombaRequestId: event.requestId },
  })

  if (existing) {
    logger.info('webhook.duplicate', { requestId: event.requestId })
    res.sendStatus(200)
    return
  }

  // ── Step 3: Validate required fields are present ─────────────────────────────
  if (
    !event.senderAccountNumber ||
    event.rawAmount === undefined ||
    (!event.accountRef && !event.receivingAccountNumber)
  ) {
    logger.error('webhook.missing_fields', {
      requestId: event.requestId,
      hasSender: !!event.senderAccountNumber,
      hasAmount: event.rawAmount !== undefined,
      hasAccountRef: !!event.accountRef,
      hasReceivingAccountNumber: !!event.receivingAccountNumber,
    })
    res.sendStatus(200)
    return
  }

  const senderAccountNumber = event.senderAccountNumber
  const senderName = event.senderName ?? 'Unknown'
  const senderBank = event.senderBank ?? 'Unknown'
  // The documented payment_success example carries transactionAmount in NAIRA
  // (decimals like 120 / fee 0.6) — NOT kobo. Do not divide by 100 here.
  const amountNGN = Number(event.rawAmount)
  const paidAt = event.paidAt ? new Date(event.paidAt) : new Date()
  const narration = event.narration ?? null

  if (!Number.isFinite(amountNGN) || amountNGN <= 0) {
    logger.error('webhook.invalid_amount', { requestId: event.requestId, rawAmount: event.rawAmount })
    res.sendStatus(200)
    return
  }

  // ── Step 4a: Per-payer virtual account (exact attribution, no matching) ─────
  // Production strategy: each enrollment can have its own VA (accountRef ==
  // enrollment.id). If this payment landed in one, we know the payer with
  // certainty — skip sender matching entirely.
  const directEnrollment =
    (event.accountRef
      ? await prisma.enrollment.findUnique({
          where: { nombaAccountRef: event.accountRef },
          include: {
            collection: true,
            payerInstallments: {
              where: { status: { in: ['pending', 'partial', 'overdue'] } },
              orderBy: { dueAt: 'asc' },
            },
          },
        })
      : null) ??
    (event.receivingAccountNumber
      ? await prisma.enrollment.findFirst({
          where: { nombaAccountNo: event.receivingAccountNumber },
          include: {
            collection: true,
            payerInstallments: {
              where: { status: { in: ['pending', 'partial', 'overdue'] } },
              orderBy: { dueAt: 'asc' },
            },
          },
        })
      : null)

  if (directEnrollment) {
    await recordMatchedPayment(directEnrollment, directEnrollment.collection, {
      requestId: event.requestId,
      amountNGN,
      senderAccountNumber,
      senderName,
      senderBank,
      narration,
      paidAt,
    })
    logger.info('webhook.processed', {
      requestId: event.requestId,
      enrollmentId: directEnrollment.id,
      amountNGN,
      via: 'per_payer_va',
    })
    res.sendStatus(200)
    return
  }

  // ── Step 4b: Shared VA — find which Collection received this payment ────────
  // Prefer accountRef (== Collection.id, set at virtual account creation — exact,
  // stable join key). Fall back to the bank account number if this payload shape
  // doesn't carry accountRef.
  const collection =
    (event.accountRef
      ? await prisma.collection.findUnique({ where: { nombaAccountRef: event.accountRef } })
      : null) ??
    (event.receivingAccountNumber
      ? await prisma.collection.findFirst({
          where: { nombaAccountNo: event.receivingAccountNumber },
        })
      : null)

  if (!collection) {
    logger.error('webhook.collection_not_found', {
      accountRef: event.accountRef,
      receivingAccountNumber: event.receivingAccountNumber,
      requestId: event.requestId,
    })
    res.sendStatus(200)
    return
  }

  // ── Step 5: Sender-account matching ──────────────────────────────────────────
  // Match against ANY bank account the payer has ever had bound (claim-and-bind
  // creates these from webhook sender details), not just the one linked on the
  // enrollment row — a payer who paid from two accounts matches on both.
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      collectionId: collection.id,
      status: 'active',
      payer: { bankAccounts: { some: { accountNumber: senderAccountNumber } } },
    },
    include: {
      payerInstallments: {
        where: { status: { in: ['pending', 'partial', 'overdue'] } },
        orderBy: { dueAt: 'asc' },
      },
    },
  })

  if (!enrollment) {
    // ── Unmatched path ─────────────────────────────────────────────────────
    logger.warn('webhook.unmatched', {
      requestId: event.requestId,
      senderAccountNumber,
      collectionId: collection.id,
    })

    await prisma.transaction.create({
      data: {
        collectionId: collection.id,
        nombaRequestId: event.requestId,
        amount: amountNGN,
        senderAccountNumber,
        senderName,
        senderBank,
        narration,
        paidAt,
        matchStatus: 'unmatched',
      },
    })

    await prisma.notification.create({
      data: {
        userId: collection.ownerId,
        type: 'payment_received',
        title: 'Unmatched payment received',
        body: `₦${amountNGN.toLocaleString()} received in ${collection.name} from an unrecognized account (${senderAccountNumber}). Needs manual review.`,
        referenceType: 'collection',
        referenceId: collection.id,
      },
    })

    res.sendStatus(200)
    return
  }

  // ── Step 6: Apply payment (with recursive overpayment cascade) ──────────────
  await recordMatchedPayment(enrollment, collection, {
    requestId: event.requestId,
    amountNGN,
    senderAccountNumber,
    senderName,
    senderBank,
    narration,
    paidAt,
  })

  logger.info('webhook.processed', {
    requestId: event.requestId,
    enrollmentId: enrollment.id,
    amountNGN,
    via: 'sender_match',
  })
  res.sendStatus(200)
}

// Shared by both attribution paths (per-payer VA exact match, and shared-VA
// sender matching): apply the payment, write the Transaction, notify both sides
// — all in one DB transaction.
async function recordMatchedPayment(
  enrollment: {
    id: string
    payerId: string
    collectionId: string
    totalPaid: Prisma.Decimal
    creditBalance: Prisma.Decimal
    payerInstallments: Array<{ id: string; amountDue: Prisma.Decimal; amountPaid: Prisma.Decimal; status: string }>
  },
  collection: { id: string; ownerId: string; name: string; repaymentType: string; chargeAmount: Prisma.Decimal },
  payment: {
    requestId: string
    amountNGN: number
    senderAccountNumber: string
    senderName: string
    senderBank: string
    narration: string | null
    paidAt: Date
  }
) {
  await prisma.$transaction(async (tx) => {
    const appliedToOverpayment = await applyPayment(tx, enrollment, collection, payment.amountNGN)

    await tx.transaction.create({
      data: {
        collectionId: collection.id,
        enrollmentId: enrollment.id,
        payerId: enrollment.payerId,
        nombaRequestId: payment.requestId,
        amount: payment.amountNGN,
        senderAccountNumber: payment.senderAccountNumber,
        senderName: payment.senderName,
        senderBank: payment.senderBank,
        narration: payment.narration,
        paidAt: payment.paidAt,
        matchStatus: 'matched',
        matchedAt: new Date(),
        appliedToOverpayment,
      },
    })

    await tx.notification.createMany({
      data: [
        {
          userId: collection.ownerId,
          type: 'payment_received',
          title: 'Payment received',
          body: `₦${payment.amountNGN.toLocaleString()} received from ${payment.senderName} in ${collection.name}`,
          referenceType: 'enrollment',
          referenceId: enrollment.id,
        },
        {
          userId: enrollment.payerId,
          type: 'payment_received',
          title: 'Payment confirmed',
          body: `Your payment of ₦${payment.amountNGN.toLocaleString()} to ${collection.name} has been received`,
          referenceType: 'enrollment',
          referenceId: enrollment.id,
        },
      ],
    })
  })
}
