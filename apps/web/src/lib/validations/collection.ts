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
  })

export type CollectionInput = z.infer<typeof collectionSchema>
export type InstallmentInput = z.infer<typeof installmentSchema>
