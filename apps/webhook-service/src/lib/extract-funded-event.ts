/**
 * CONFIRMED by Nomba support (2026-07-06): virtual account funding via transfer
 * delivers as a `payment_success` event, not `virtual_account.funded`.
 *
 * Field paths below are aligned with the documented `payment_success` payload for
 * `vact_transfer` (developer.nomba.com/docs/api-basics/webhook), which nests under
 * `data.transaction.*` and `data.customer.*`:
 *
 *   data.transaction.transactionAmount   — amount, in NAIRA (decimal), NOT kobo
 *   data.transaction.aliasAccountNumber  — the virtual account NUBAN that received funds
 *   data.transaction.aliasAccountReference — our accountRef (== Collection.id)
 *   data.transaction.narration / time
 *   data.customer.accountNumber          — sender's account number (the matching key)
 *   data.customer.senderName / bankName
 *
 * Earlier flat-path candidates are kept as fallbacks until a live delivery is
 * captured and logged (the handler logs every raw payload for exactly that).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

export interface ParsedFundedEvent {
  requestId: string | undefined
  eventType: string | undefined
  transactionType: string | undefined
  accountRef: string | undefined
  receivingAccountNumber: string | undefined
  /** Amount exactly as found in the payload — treated as NGN (naira), per the documented example. */
  rawAmount: number | undefined
  senderAccountNumber: string | undefined
  senderName: string | undefined
  senderBank: string | undefined
  narration: string | undefined
  paidAt: string | undefined
}

export function parseFundedEvent(raw: Json): ParsedFundedEvent {
  const data = raw?.data ?? raw ?? {}
  const txn = data?.transaction ?? {}
  const customer = data?.customer ?? {}

  return {
    requestId: raw?.requestId ?? data?.requestId ?? raw?.id,
    eventType: raw?.event_type ?? raw?.type ?? raw?.event,
    transactionType: txn?.type,
    // Preferred match key: accountRef == Collection.id (set at virtual account creation).
    accountRef:
      txn?.aliasAccountReference ??
      data?.accountRef ??
      data?.virtualAccount?.accountRef ??
      data?.aliasAccountReference ??
      data?.account?.accountRef,
    // Fallback match key if accountRef isn't present on this payload shape:
    // Collection.nombaAccountNo (the bank account number returned at creation time).
    receivingAccountNumber:
      txn?.aliasAccountNumber ??
      data?.accountNumber ??
      data?.virtualAccount?.accountNumber ??
      data?.account?.accountNumber,
    rawAmount: txn?.transactionAmount ?? data?.amount ?? data?.transactionAmount ?? data?.value,
    senderAccountNumber:
      customer?.accountNumber ?? data?.sender?.accountNumber ?? data?.senderAccountNumber,
    senderName:
      customer?.senderName ??
      customer?.accountName ??
      data?.sender?.accountName ??
      data?.senderName,
    senderBank:
      customer?.bankName ?? customer?.bank ?? data?.sender?.bank ?? data?.senderBank,
    narration: txn?.narration ?? data?.narration ?? data?.description,
    paidAt: txn?.time ?? data?.transactionDate ?? data?.paidAt ?? data?.createdAt,
  }
}
