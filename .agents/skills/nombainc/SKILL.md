---
name: Nombainc
description: Use when building payment acceptance flows, processing bank transfers, managing virtual accounts, or integrating fintech services. Reach for this skill when agents need to help customers accept payments online, create checkout orders, set up webhooks, manage accounts, or handle financial transactions via API.
metadata:
    mintlify-proj: nombainc
    version: "1.0"
---

# Nomba API Skill

## Product summary

Nomba is a fintech API platform for accepting payments, processing transfers, and managing financial accounts across Africa. Agents use it to help customers build payment flows (checkout, virtual accounts, direct debit), process bank transfers, manage sub-accounts, and handle webhooks. The primary API endpoint is `https://api.nomba.com` (production) or `https://sandbox.nomba.com` (testing). Key files: API keys are generated in the dashboard under Developer → API Keys. Authentication uses OAuth 2.0 with `client_id` and `client_secret`. All responses follow a standard structure with a `code` field (success = `"00"`). See the [primary docs site](https://developer.nomba.com) for full reference.

## When to use

Reach for this skill when:
- A customer needs to accept online payments (card, bank transfer, USSD, mobile money)
- Building a checkout flow or payment link
- Creating virtual accounts for customers to receive payments
- Processing bank transfers to external accounts
- Setting up webhooks to receive payment notifications
- Managing sub-accounts or split payments
- Handling direct debit or recurring billing
- Testing payment flows in sandbox before going live
- Debugging authentication, rate limits, or webhook signature verification
- Integrating with Shopify, WooCommerce, or custom applications

## Quick reference

### Authentication flow
1. Obtain `access_token` via `POST /v1/auth/token/issue` with `client_credentials` grant
2. Token expires in 30 minutes — refresh proactively using `refresh_token`
3. Include `Authorization: Bearer <access_token>` and `accountId` headers on all requests
4. Revoke tokens immediately if compromised

### Base URLs
| Environment | URL | Use |
|---|---|---|
| Production | `https://api.nomba.com` | Live transactions, real money |
| Sandbox | `https://sandbox.nomba.com` | Testing, no real funds |

### Response structure
All responses follow this format:
```json
{
  "code": "00",
  "description": "Success",
  "data": { ... }
}
```
- `code` = `"00"` means success; all other codes are errors
- Always check `code` field, not HTTP status alone
- `description` explains errors

### Key endpoints
| Task | Method | Endpoint |
|---|---|---|
| Create checkout order | POST | `/v1/checkout/order` |
| Create virtual account | POST | `/v1/accounts/virtual` |
| Bank transfer | POST | `/v2/transfers/bank` |
| Bank lookup | POST | `/v1/transfers/bank/lookup` |
| Fetch bank codes | GET | `/v1/transfers/bank` |
| Verify transaction | GET | `/v1/checkout/transaction/{orderReference}` |
| Create direct debit | POST | `/v1/direct-debit` |

### Rate limits (default)
- 75 requests per second (1000ms window)
- 15 POST requests per second
- 5 bank transfers to same recipient per minute
- Check `X-Rate-Limit-Remaining` header to monitor quota

### Webhook events
- `payment_success` — payment received
- `payout_success` — transfer completed
- `payment_failed` — payment attempt failed
- `payment_reversal` — payment reversed
- `payout_failed` — transfer failed
- `payout_refund` — transfer refunded

## Decision guidance

| Scenario | Use Checkout | Use Virtual Account | Use Direct Debit |
|---|---|---|---|
| One-time online payment | ✓ | — | — |
| Customer receives multiple payments | — | ✓ | — |
| Recurring/subscription billing | ✓ (with tokenize) | — | ✓ |
| Invoice-based payment | — | ✓ (with expectedAmount) | — |
| Time-limited payment link | ✓ | ✓ (with expiryDate) | — |
| Pull funds from customer account | — | — | ✓ |

| Scenario | Use Sandbox | Use Production |
|---|---|---|
| Development, testing, learning | ✓ | — |
| Before first live transaction | ✓ | — |
| Real customer payments | — | ✓ |
| Debugging webhook flows | ✓ | — |

## Workflow

### Accept online payments via checkout
1. **Authenticate**: Obtain `access_token` using `client_id` and `client_secret`
2. **Create order**: POST to `/v1/checkout/order` with amount, currency, callback URL
3. **Get checkout link**: Extract `checkoutLink` from response
4. **Display to customer**: Redirect or embed the link
5. **Receive webhook**: Listen for `payment_success` event on your webhook URL
6. **Verify transaction**: Call `/v1/checkout/transaction/{orderReference}` to confirm
7. **Deliver goods/services**: Only after verification succeeds

### Create virtual account for receiving payments
1. **Authenticate**: Get `access_token`
2. **Create account**: POST to `/v1/accounts/virtual` with `accountRef`, `accountName`, `currency`
3. **Store account number**: Save the returned `bankAccountNumber` and `bankName`
4. **Share with customer**: Provide account details for bank transfers
5. **Monitor transfers**: Webhooks notify you of inflows
6. **Verify**: Call `/v1/checkout/transaction/{orderReference}` or requery endpoint

### Set up webhooks
1. **Go to dashboard**: Developer → Webhook Setup
2. **Enter webhook URL**: Must be publicly accessible HTTPS
3. **Set signature key**: Use for HMAC verification
4. **Subscribe to events**: Select which events to receive
5. **Verify signatures**: On receipt, compute HMAC-SHA256 using payload + secret + timestamp
6. **Compare headers**: Match your hash against `nomba-signature` header
7. **Respond with 2XX**: Return 200 status to confirm receipt; Nomba retries on failure

### Process bank transfer
1. **Authenticate**: Get `access_token`
2. **Fetch banks**: GET `/v1/transfers/bank` to get bank codes
3. **Lookup account**: POST `/v1/transfers/bank/lookup` with account number and bank code
4. **Initiate transfer**: POST `/v2/transfers/bank` with amount, account, bank code, unique `merchantTxRef`
5. **Check status**: Response includes `status` (SUCCESS, PENDING_BILLING, REFUND)
6. **Wait for webhook**: Listen for `payout_success` or `payout_failed`
7. **Requery if needed**: Use transaction ID to check status if webhook is delayed

## Common gotchas

- **Always check `code` field, not HTTP status**: A 200 response with `code: "02"` is an error
- **Token expiry**: Access tokens expire in 30 minutes. Refresh 5 minutes before expiry, not after
- **Sandbox vs production**: Credentials are environment-specific. Sandbox keys only work with `sandbox.nomba.com`
- **Missing `accountId` header**: Required on all authenticated requests; omit only for no-auth sandbox tests
- **Webhook signature verification is critical**: Never trust webhooks without verifying the HMAC signature
- **Virtual account limits**: Max 2 per user, max ₦150 per transfer in sandbox
- **DRC accounts cannot use NGN**: DRC checkout must use CDF or USD; NGN will be rejected
- **Rate limit on same recipient**: Only 5 bank transfers to the same account per minute
- **Idempotency key for transfers**: Use `X-Idempotent-key` header to prevent duplicate transfers on retry
- **Order reference uniqueness**: Reusing an `orderReference` may cause errors; use UUID v4
- **Webhook retry backoff**: Failed webhooks retry up to 5 times with exponential backoff (2 min, 5 min, 11 min, 24 min, 53 min)
- **Split payment fees**: Transaction fees are always deducted from the primary account, not split accounts
- **Virtual account expiry**: Set `expiryDate` for dynamic accounts; omit for static (permanent) accounts
- **Expected amount restriction**: Once set, virtual account only accepts that exact amount; other amounts are rejected

## Verification checklist

Before submitting work:
- [ ] Tested in sandbox first with correct sandbox credentials
- [ ] All API responses checked for `code: "00"` (not just HTTP 200)
- [ ] `Authorization` header includes `Bearer <token>` and `accountId` is set
- [ ] Webhook URL is publicly accessible HTTPS
- [ ] Webhook signature verification implemented (HMAC-SHA256)
- [ ] Idempotency key used for bank transfers
- [ ] Order reference is unique (UUID v4 recommended)
- [ ] Callback URL is HTTPS and handles `orderReference` query parameter
- [ ] Rate limits respected (5 transfers per minute to same recipient)
- [ ] Token refresh logic handles 30-minute expiry
- [ ] Error handling covers `code` field, not just HTTP status
- [ ] Webhook retry logic implemented (exponential backoff)
- [ ] Sub-account IDs verified if using split payments
- [ ] Currency matches account region (DRC ≠ NGN)

## Resources

- **Full page navigation**: See [https://developer.nomba.com/llms.txt](https://developer.nomba.com/llms.txt) for comprehensive page-by-page listing
- **API Reference**: [https://developer.nomba.com/nomba-api-reference/introduction](https://developer.nomba.com/nomba-api-reference/introduction)
- **Authentication guide**: [https://developer.nomba.com/docs/getting-started/authentication](https://developer.nomba.com/docs/getting-started/authentication)
- **Webhook setup**: [https://developer.nomba.com/docs/api-basics/webhook](https://developer.nomba.com/docs/api-basics/webhook)

---

> For additional documentation and navigation, see: https://developer.nomba.com/llms.txt