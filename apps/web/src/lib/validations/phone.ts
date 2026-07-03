import { z } from 'zod'

// Nigerian mobile numbers: 11 digits starting with 0 (e.g. 0803...), or +234
// followed by 10 digits. Second digit is always 7, 8, or 9 for mobile ranges.
export const NIGERIA_PHONE_REGEX = /^(?:\+234|0)[789]\d{9}$/

export const phoneSchema = z
  .string()
  .regex(NIGERIA_PHONE_REGEX, 'Enter a valid Nigerian phone number (e.g. 08012345678)')
