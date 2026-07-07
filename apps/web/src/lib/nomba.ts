import { Redis } from '@upstash/redis'

// ─── Credentials ─────────────────────────────────────────────────────────────
//
// Production model: each owner binds their OWN Nomba business account
// (NombaConnection — accountId, clientId, clientSecret, subAccountId), so their
// Collections' virtual accounts are created under their account and funds land
// with them, never with Paybook. The env credentials are the platform fallback
// (and the hackathon demo account). All call paths accept a credentials object.

export interface NombaCredentials {
  accountId: string
  clientId: string
  clientSecret: string
  subAccountId: string
}

export function envNombaCredentials(): NombaCredentials {
  return {
    accountId: process.env.NOMBA_ACCOUNT_ID!,
    clientId: process.env.NOMBA_CLIENT_ID!,
    clientSecret: process.env.NOMBA_CLIENT_SECRET!,
    subAccountId: process.env.NOMBA_SUB_ACCOUNT_ID!,
  }
}

// ─── Token cache — Upstash Redis when configured, in-process fallback otherwise ────
//
// Keyed per Nomba account: different owners' connections cache independently.
// Nomba docs say tokens live 30 min; cache 25 and rely on the 401-retry
// fallback in nombaFetch() if either assumption is ever wrong.

const TOKEN_TTL_SECONDS = 25 * 60

let _redis: Redis | null | undefined
const memTokens = new Map<string, { value: string; expiresAt: number }>()

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  _redis = url && token ? new Redis({ url, token }) : null
  return _redis
}

function tokenKey(creds: NombaCredentials): string {
  return `nomba:access_token:${creds.accountId}`
}

async function cacheToken(creds: NombaCredentials, token: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    await redis.set(tokenKey(creds), token, { ex: TOKEN_TTL_SECONDS })
    return
  }
  memTokens.set(tokenKey(creds), { value: token, expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000 })
}

async function readCachedToken(creds: NombaCredentials): Promise<string | null> {
  const redis = getRedis()
  if (redis) return redis.get<string>(tokenKey(creds))
  const cached = memTokens.get(tokenKey(creds))
  if (cached && cached.expiresAt > Date.now()) return cached.value
  return null
}

// ─── Structured logger ──────────────────────────────────────────────────────────

function logNombaCall(path: string, method: string, ref: string | undefined, status: number, ok: boolean) {
  const entry = {
    ts: new Date().toISOString(),
    service: 'nomba',
    path,
    method,
    ref,
    status,
    ok,
  }
  if (ok) {
    console.log(JSON.stringify(entry))
  } else {
    console.error(JSON.stringify(entry))
  }
}

// ─── Token issuance ──────────────────────────────────────────────────────────────

export async function issueToken(creds: NombaCredentials): Promise<string> {
  const res = await fetch(`${process.env.NOMBA_BASE_URL}/auth/token/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accountId: creds.accountId,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Nomba token issuance failed: ${res.status} — ${body}`)
  }

  // Nomba can return HTTP 200 with an error `code` in the body (per the bundled
  // integration skill: "a 200 response with code: '02' is an error") — HTTP status
  // alone is not sufficient.
  const json = (await res.json()) as { code?: string; description?: string; data: { access_token: string } }
  if (json.code && json.code !== '00') {
    throw new Error(`Nomba token issuance failed: code ${json.code} — ${json.description ?? 'no description'}`)
  }
  const token = json.data.access_token

  await cacheToken(creds, token)
  return token
}

async function getNombaToken(creds: NombaCredentials): Promise<string> {
  const cached = await readCachedToken(creds)
  if (cached) return cached
  return issueToken(creds)
}

// ─── nombaFetch — single entry point for ALL Nomba API calls ───────────────────

export async function nombaFetch(
  path: string,
  options: RequestInit & { _ref?: string; _creds?: NombaCredentials } = {}
): Promise<Response> {
  const { _ref, _creds, ...fetchOptions } = options
  const creds = _creds ?? envNombaCredentials()
  const method = (fetchOptions.method ?? 'GET').toUpperCase()

  const doFetch = async (token: string) =>
    fetch(`${process.env.NOMBA_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
        accountId: creds.accountId,
      },
    })

  const token = await getNombaToken(creds)
  let res = await doFetch(token)

  // Defensive fallback: if the cached token was stale/rejected, refresh once and retry
  if (res.status === 401) {
    const fresh = await issueToken(creds)
    res = await doFetch(fresh)
  }

  logNombaCall(path, method, _ref, res.status, res.ok)
  return res
}

// ─── Typed API wrappers ──────────────────────────────────────────────────────────
//
// NOTE: sub-accounts have no creation API (dashboard-only, confirmed against
// production docs 2026-07-07). The subAccountId used as the VA-creation path
// param comes from the owner's NombaConnection (their default), optionally
// overridden per Collection by a dashboard-created "pocket" sub-account ID.

// Field names confirmed against a live sandbox response (2026-07-02) — the
// official API reference's `accountNumber`/`accountName` naming was wrong.
export interface NombaVirtualAccount {
  bankAccountNumber: string
  bankAccountName: string
  bankName: string
  accountRef: string
  accountName: string
  accountHolderId: string
  currency: string
  bvn?: string
  expired: boolean
  createdAt: string
}

export async function createVirtualAccount(
  params: {
    accountRef: string // our collection.id or enrollment.id; must be 16-64 chars (UUID = 36 OK)
    accountName: string // must be 8-64 chars — validate at form level before calling
    subAccountId?: string // per-Collection pocket override; defaults to the credentials' sub-account
  },
  creds: NombaCredentials = envNombaCredentials()
): Promise<NombaVirtualAccount> {
  const subAccountId = params.subAccountId ?? creds.subAccountId
  if (!subAccountId) {
    throw new Error('No sub-account ID available for virtual account creation')
  }

  const res = await nombaFetch(`/accounts/virtual/${subAccountId}`, {
    method: 'POST',
    body: JSON.stringify({
      accountRef: params.accountRef,
      accountName: params.accountName,
      // expiryDate omitted -> permanent static virtual account
      // expectedAmount omitted -> part_payment/installment Collections accept any amount
    }),
    _ref: params.accountRef,
    _creds: creds,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`createVirtualAccount failed: ${res.status} — ${body}`)
  }

  // See issueToken() above — HTTP 200 with an error `code` in the body is possible.
  const json = (await res.json()) as { code?: string; description?: string; data: NombaVirtualAccount }
  if (json.code && json.code !== '00') {
    throw new Error(`createVirtualAccount failed: code ${json.code} — ${json.description ?? 'no description'}`)
  }
  return json.data
}
