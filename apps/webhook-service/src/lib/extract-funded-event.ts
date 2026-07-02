/**
 * Field paths for `virtual_account.funded` are NOT yet confirmed against a live
 * delivery (see docs/NOMBA_INTEGRATION.md, Section 5). Each field below tries a
 * few candidate paths inferred from the `payment_success` payload shape, since
 * that's the closest confirmed reference. Once a real payload has been captured,
 * collapse this back down to the single confirmed path per field and update the doc.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

export interface ParsedFundedEvent {
  requestId: string | undefined
  eventType: string | undefined
  accountRef: string | undefined
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
    accountRef:
      data?.accountRef ??
      data?.virtualAccount?.accountRef ??
      data?.aliasAccountReference ??
      data?.account?.accountRef,
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
