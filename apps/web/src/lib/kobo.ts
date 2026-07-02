/**
 * Single source of truth for NGN <-> kobo conversion.
 * All monetary values are stored in NGN (major unit) in the database.
 * Kobo appears only at the Nomba API boundary.
 */

export function toKobo(ngn: number | string): number {
  const value = typeof ngn === 'string' ? parseFloat(ngn) : ngn
  if (!isFinite(value) || value < 0) throw new Error(`Invalid NGN amount: ${ngn}`)
  return Math.round(value * 100)
}

export function fromKobo(kobo: number): number {
  if (!Number.isInteger(kobo) || kobo < 0) throw new Error(`Invalid kobo amount: ${kobo}`)
  return kobo / 100
}
