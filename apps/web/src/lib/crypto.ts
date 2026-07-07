import crypto from 'crypto'

// AES-256-GCM for owner Nomba credentials at rest. Format: iv.ciphertext.tag
// (hex, dot-separated). Key: PAYBOOK_ENCRYPTION_KEY, 64 hex chars (32 bytes).

function getKey(): Buffer {
  const hex = process.env.PAYBOOK_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('PAYBOOK_ENCRYPTION_KEY must be set to 64 hex characters (openssl rand -hex 32)')
  }
  return Buffer.from(hex, 'hex')
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `${iv.toString('hex')}.${ciphertext.toString('hex')}.${cipher.getAuthTag().toString('hex')}`
}

export function decryptSecret(encrypted: string): string {
  const [ivHex, dataHex, tagHex] = encrypted.split('.')
  if (!ivHex || !dataHex || !tagHex) throw new Error('Malformed encrypted secret')
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
}
