import crypto from 'crypto'

// The raw token only ever exists in the emailed link. We store its hash so a
// leaked VerificationToken row can never be used to log in or reset a password.
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}
