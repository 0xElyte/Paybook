import crypto from 'crypto'

export function verifyNombaSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature) return false

  const secret = process.env.NOMBA_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('NOMBA_WEBHOOK_SECRET environment variable is not set')
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  // Constant-time comparison to avoid timing attacks
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return false
  return crypto.timingSafeEqual(sigBuf, expBuf)
}
