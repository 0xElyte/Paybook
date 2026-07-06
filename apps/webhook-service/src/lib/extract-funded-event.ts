/**
 * CONFIRMED by Nomba support (2026-07-06): virtual account funding via transfer
 * delivers as a `payment_success` event, not `virtual_account.funded`. Support also
 * noted the payload carries a "TRF or VA reference" and the NUBAN the funds landed
 * in — but exact field paths still aren't confirmed against a real captured payload
 * (see docs/NOMBA_INTEGRATION.md, Section 5). Each field below tries a few candidate
 * paths inferred from general `payment_success` shape. Once a real payload is
 * captured, collapse this down to the single confirmed path per field and update
 * the doc.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

export interface ParsedFundedEvent {
  requestId: string | undefined
  eventType: string | undefined
  accountRef: string | undefined
  receivingAccountNumber: string | undefined
  rawAmount: number | undefined
  senderAccountNumber: string | undefined
  senderName: string | undefined
  senderBank: string | undefined
  narration: string | undefined
  paidAt: string | undefined
}

export function parseFundedEvent(raw: Json): ParsedFundedEvent {
  const data = raw?.data ?? raw ?? {}

  return {
    requestId: raw?.requestId ?? data?.requestId ?? raw?.id,
    eventType: raw?.event_type ?? raw?.type ?? raw?.event,
    // Preferred match key: accountRef == Collection.id (set at virtual account creation).
    accountRef:
      data?.accountRef ??
      data?.virtualAccount?.accountRef ??
      data?.aliasAccountReference ??
      data?.account?.accountRef,
    // Fallback match key if accountRef isn't present on this payload shape:
    // Collection.nombaAccountNo (the bank account number returned at creation time).
    receivingAccountNumber:
      data?.accountNumber ??
      data?.virtualAccount?.accountNumber ??
      data?.account?.accountNumber,
    rawAmount: data?.amount ?? data?.transactionAmount ?? data?.value,
    senderAccountNumber:
      data?.customer?.accountNumber ?? data?.sender?.accountNumber ?? data?.senderAccountNumber,
    senderName: data?.customer?.accountName ?? data?.sender?.accountName ?? data?.senderName,
    senderBank:
      data?.customer?.bank ?? data?.sender?.bank ?? data?.senderBank ?? data?.customer?.bankName,
    narration: data?.narration ?? data?.description,
    paidAt: data?.transactionDate ?? data?.paidAt ?? data?.createdAt,
  }
}
