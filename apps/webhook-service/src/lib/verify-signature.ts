import crypto from 'crypto'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

export interface SignatureInput {
  rawBody: Buffer
  payload: Json
  signature: string | undefined // nomba-signature (or nomba-sig-value) header
  timestamp: string | undefined // nomba-timestamp header (RFC-3339)
}

/**
 * Nomba's documented scheme (developer.nomba.com/docs/api-basics/webhook):
 * HMAC-SHA256, Base64-encoded, over the colon-joined string
 *
 *   {eventType}:{requestId}:{userId}:{walletId}:{transactionId}:{transactionType}
 *     :{transactionTime}:{responseCode}:{nomba-timestamp}
 *
 * where the fields come from the parsed payload (data.merchant.*, data.transaction.*)
 * and responseCode of "null"/null is treated as an empty string.
 *
 * We also accept a plain HMAC over the raw body (hex or base64) as a fallback,
 * in case the sandbox signs differently from the documented production scheme —
 * accepting either costs nothing and both require knowledge of the secret.
 */
export function verifyNombaSignature(input: SignatureInput): boolean {
  const { rawBody, payload, signature, timestamp } = input
  if (!signature) return false

  const secret = process.env.NOMBA_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('NOMBA_WEBHOOK_SECRET environment variable is not set')
  }

  const candidates: string[] = []

  const merchant = payload?.data?.merchant ?? {}
  const transaction = payload?.data?.transaction ?? {}
  const responseCode =
    transaction.responseCode == null || transaction.responseCode === 'null'
      ? ''
      : String(transaction.responseCode)

  const signedString = [
    payload?.event_type ?? '',
    payload?.requestId ?? '',
    merchant.userId ?? '',
    merchant.walletId ?? '',
    transaction.transactionId ?? '',
    transaction.type ?? '',
    transaction.time ?? '',
    responseCode,
    timestamp ?? '',
  ].join(':')

  candidates.push(crypto.createHmac('sha256', secret).update(signedString).digest('base64'))
  candidates.push(crypto.createHmac('sha256', secret).update(signedString).digest('hex'))

  // Fallback: raw-body HMAC (the scheme this service originally assumed)
  candidates.push(crypto.createHmac('sha256', secret).update(rawBody).digest('base64'))
  candidates.push(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'))

  return candidates.some((expected) => constantTimeEqual(signature, expected))
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}
