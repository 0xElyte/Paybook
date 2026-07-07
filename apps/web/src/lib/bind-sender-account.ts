import type { PrismaTx } from '@paybook/db/payment-application'
import { nigerianBanks } from '@/lib/nigerian-banks'

// Claim-and-bind: the payer's sending account is learned from the webhook's own
// sender fields at the moment a payment is first claimed (by the payer) or
// assigned (by the owner) — never self-declared through a form. From then on
// the webhook auto-matches every future transfer from that account.
export async function bindSenderAccount(
  tx: PrismaTx,
  params: {
    payerId: string
    enrollmentId: string
    currentBankAccountId: string | null
    senderAccountNumber: string
    senderName: string
    senderBank: string
  }
): Promise<void> {
  const { payerId, enrollmentId, currentBankAccountId, senderAccountNumber, senderName, senderBank } = params

  const bankCode = resolveBankCode(senderBank)

  const bankAccount = await tx.bankAccount.upsert({
    where: {
      accountNumber_bankCode_userId: {
        accountNumber: senderAccountNumber,
        bankCode,
        userId: payerId,
      },
    },
    update: {},
    create: {
      userId: payerId,
      accountNumber: senderAccountNumber,
      bankCode,
      bankName: senderBank,
      accountName: senderName,
    },
  })

  // First binding wins for the enrollment record; additional sending accounts
  // still auto-match via the payer's BankAccount rows, so never overwrite.
  if (!currentBankAccountId) {
    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { bankAccountId: bankAccount.id },
    })
  }
}

function resolveBankCode(senderBank: string): string {
  const needle = senderBank.trim().toLowerCase()
  if (!needle) return ''
  const match = nigerianBanks.find(
    (b) => b.name.toLowerCase() === needle || b.name.toLowerCase().includes(needle) || needle.includes(b.name.toLowerCase())
  )
  return match?.code ?? ''
}
