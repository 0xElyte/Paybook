import { Redis } from '@upstash/redis'

// ─── Token cache — Upstash Redis when configured, in-process fallback otherwise ────
//
// Falling back lets local/sandbox testing proceed before UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN are wired up. The in-memory cache is per-process only
// (not shared with apps/webhook-service), so it must be replaced by real Upstash
// credentials before both services rely on nombaFetch concurrently in production.

const TOKEN_KEY = 'nomba:access_token'
const TOKEN_TTL_SECONDS = 55 * 60 // proactive refresh 5 min before the real 60-min expiry

let _redis: Redis | null | undefined
let memToken: { value: string; expiresAt: number } | null = null

function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  _redis = url && token ? new Redis({ url, token }) : null
  return _redis
}

async function cacheToken(token: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    await redis.set(TOKEN_KEY, token, { ex: TOKEN_TTL_SECONDS })
    return
  }
  memToken = { value: token, expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000 }
}

async function readCachedToken(): Promise<string | null> {
  const redis = getRedis()
  if (redis) return redis.get<string>(TOKEN_KEY)
  if (memToken && memToken.expiresAt > Date.now()) return memToken.value
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

async function issueToken(): Promise<string> {
  const res = await fetch(`${process.env.NOMBA_BASE_URL}/auth/token/issue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accountId: process.env.NOMBA_ACCOUNT_ID!,
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.NOMBA_CLIENT_ID!,
      client_secret: process.env.NOMBA_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Nomba token issuance failed: ${res.status} — ${body}`)
  }

  const json = (await res.json()) as { data: { access_token: string } }
  const token = json.data.access_token

  await cacheToken(token)
  return token
}

async function getNombaToken(): Promise<string> {
  const cached = await readCachedToken()
  if (cached) return cached
  return issueToken()
}

// ─── nombaFetch — single entry point for ALL Nomba API calls ───────────────────

export async function nombaFetch(
  path: string,
  options: RequestInit & { _ref?: string } = {}
): Promise<Response> {
  const { _ref, ...fetchOptions } = options
  const method = (fetchOptions.method ?? 'GET').toUpperCase()

  const doFetch = async (token: string) =>
    fetch(`${process.env.NOMBA_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
        accountId: process.env.NOMBA_ACCOUNT_ID!,
      },
    })

  const token = await getNombaToken()
  let res = await doFetch(token)

  // Defensive fallback: if the cached token was stale/rejected, refresh once and retry
  if (res.status === 401) {
    const fresh = await issueToken()
    res = await doFetch(fresh)
  }

  logNombaCall(path, method, _ref, res.status, res.ok)
  return res
}

// ─── Typed API wrappers ──────────────────────────────────────────────────────────
//
// NOTE: there is no createSubAccount(). Nomba pre-provisions exactly one sub-account
// per hackathon participant (delivered via credentials email), stored as the env var
// NOMBA_SUB_ACCOUNT_ID. Sub-accounts are never created at runtime.

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

export async function createVirtualAccount(params: {
  accountRef: string // our collection.id; must be 16-64 chars (UUID = 36 chars OK)
  accountName: string // must be 8-64 chars — validate at form level before calling
}): Promise<NombaVirtualAccount> {
  const subAccountId = process.env.NOMBA_SUB_ACCOUNT_ID
  if (!subAccountId) {
    throw new Error('NOMBA_SUB_ACCOUNT_ID environment variable is not set')
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
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`createVirtualAccount failed: ${res.status} — ${body}`)
  }

  const json = (await res.json()) as { data: NombaVirtualAccount }
  return json.data
}
