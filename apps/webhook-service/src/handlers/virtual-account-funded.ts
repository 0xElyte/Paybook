import type { Request, Response } from 'express'
import { prisma } from '@paybook/db'
import { applyPayment } from '@paybook/db/payment-application'
import { verifyNombaSignature } from '../lib/verify-signature'
import { parseFundedEvent } from '../lib/extract-funded-event'
import { fromKobo } from '../lib/kobo'
import { logger } from '../lib/logger'

export async function handleVirtualAccountFunded(req: Request, res: Response) {
  const rawBody = req.body as Buffer
  const signature = req.header('nomba-signature') ?? req.header('nomba-sig-value')

  // ── Step 1: Verify signature — reject immediately if invalid ────────────────
  let signatureValid = false
  try {
    signatureValid = verifyNombaSignature(rawBody, signature)
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
    })
    res.status(401).send('bad signature')
    return
  }

  const raw = JSON.parse(rawBody.toString())
  const event = parseFundedEvent(raw)

  // Log the full raw payload on every delivery — this is how the first real
  // virtual_account.funded delivery gets inspected to confirm field paths
  // (see refs/docs/NOMBA_INTEGRATION.md, Section 5, outstanding checkpoint).
  logger.info('webhook.received', { eventType: event.eventType, raw })

  // Accept both event names defensively. `virtual_account.funded` was the original
  // assumption, but Nomba's public docs (developer.nomba.com) and the bundled
  // integration skill only document `payment_success` as the "payment received"
  // event — there is no `virtual_account.funded` in their canonical event list.
  // Paybook never uses Checkout, so any `payment_success` this account receives can
  // only be a virtual account funding — accepting it carries no ambiguity risk here,
  // and silently dropping a real payment would be the exact failure mode this
  // product exists to prevent. Once a real delivery is captured, narrow this back
  // down to whichever single name is actually confirmed — see NOMBA_INTEGRATION.md
  // Section 5.
  const ACCEPTED_EVENT_TYPES = new Set(['virtual_account.funded', 'payment_success'])
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
  const amountNGN = fromKobo(event.rawAmount)
  const paidAt = event.paidAt ? new Date(event.paidAt) : new Date()
  const narration = event.narration ?? null

  // ── Step 4: Find which Collection received this payment ─────────────────────
  // Prefer accountRef (== Collection.id, set at virtual account creation — exact,
  // stable join key). Fall back to the bank account number if this payload shape
  // doesn't carry accountRef.
  const collection = event.accountRef
    ? await prisma.collection.findUnique({ where: { nombaAccountRef: event.accountRef } })
    : await prisma.collection.findFirst({
        where: { nombaAccountNo: event.receivingAccountNumber },
      })

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
  const matchingBankAccount = await prisma.bankAccount.findFirst({
    where: {
      accountNumber: senderAccountNumber,
      enrollments: {
        some: {
          collectionId: collection.id,
          status: 'active',
        },
      },
    },
    include: {
      enrollments: {
        where: {
          collectionId: collection.id,
          status: 'active',
        },
        include: {
          payerInstallments: {
            where: { status: { in: ['pending', 'partial', 'overdue'] } },
            orderBy: { dueAt: 'asc' },
          },
        },
      },
    },
  })

  if (!matchingBankAccount || matchingBankAccount.enrollments.length === 0) {
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

  const enrollment = matchingBankAccount.enrollments[0]

  // ── Step 6: Apply payment (with recursive overpayment cascade) ──────────────
  await prisma.$transaction(async (tx) => {
    const appliedToOverpayment = await applyPayment(tx, enrollment, collection, amountNGN)

    await tx.transaction.create({
      data: {
        collectionId: collection.id,
        enrollmentId: enrollment.id,
        payerId: enrollment.payerId,
        nombaRequestId: event.requestId!,
        amount: amountNGN,
        senderAccountNumber,
        senderName,
        senderBank,
        narration,
        paidAt,
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
          body: `₦${amountNGN.toLocaleString()} received from ${senderName} in ${collection.name}`,
          referenceType: 'enrollment',
          referenceId: enrollment.id,
        },
        {
          userId: enrollment.payerId,
          type: 'payment_received',
          title: 'Payment confirmed',
          body: `Your payment of ₦${amountNGN.toLocaleString()} to ${collection.name} has been received`,
          referenceType: 'enrollment',
          referenceId: enrollment.id,
        },
      ],
    })
  })

  logger.info('webhook.processed', {
    requestId: event.requestId,
    enrollmentId: enrollment.id,
    amountNGN,
  })
  res.sendStatus(200)
}
