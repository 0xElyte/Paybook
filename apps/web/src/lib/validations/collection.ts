import { z } from 'zod'

export const durationUnits = ['days', 'weeks', 'months', 'years'] as const
export const repaymentTypes = ['one_time', 'part_payment', 'installment'] as const

export const installmentSchema = z.object({
  percentage: z.number().min(0.01).max(100),
  dueAfterValue: z.number().int().min(1),
  dueAfterUnit: z.enum(durationUnits),
})

export const collectionSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters').max(100),
    description: z.string().max(500).optional(),
    chargeAmount: z.number().positive('Charge amount must be greater than 0'),
    durationValue: z.number().int().min(1),
    durationUnit: z.enum(durationUnits),
    repaymentType: z.enum(repaymentTypes),
    installments: z.array(installmentSchema).optional(),
    // Optional dashboard-created sub-account "pocket" for this Collection —
    // sub-accounts have no creation API, so owners paste the ID if they want
    // Nomba-level fund segregation per Collection.
    nombaSubAccountId: z.string().min(8).max(80).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.repaymentType !== 'installment') return

    if (!data.installments || data.installments.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Installment plans need at least 2 installments',
        path: ['installments'],
      })
      return
    }

    const total = data.installments.reduce((sum, i) => sum + i.percentage, 0)
    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Installment percentages must sum to 100 (currently ${total.toFixed(2)})`,
        path: ['installments'],
      })
    }

    // Installments are strictly sequential in time: each installment's due-after
    // period (from the payer's joinedAt) must be >= the sum of the due-after
    // periods of all installments before it (SCHEMA.md, Installment rules).
    let cumulativeDays = 0
    for (let i = 0; i < data.installments.length; i++) {
      const inst = data.installments[i]
      const days = toDays(inst.dueAfterValue, inst.dueAfterUnit)
      if (i > 0 && days < cumulativeDays) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Installment ${i + 1} is due before the installments preceding it — due dates must be sequential`,
          path: ['installments', i, 'dueAfterValue'],
        })
        return
      }
      cumulativeDays += days
    }
  })

const DAYS_PER_UNIT: Record<(typeof durationUnits)[number], number> = {
  days: 1,
  weeks: 7,
  months: 30,
  years: 365,
}

function toDays(value: number, unit: (typeof durationUnits)[number]): number {
  return value * DAYS_PER_UNIT[unit]
}

export type CollectionInput = z.infer<typeof collectionSchema>
export type InstallmentInput = z.infer<typeof installmentSchema>
