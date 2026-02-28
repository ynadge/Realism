import { Redis } from '@upstash/redis'

let _client: Redis | null = null

export function getUpstash(): Redis {
  if (_client) return _client

  const url = process.env.UPSTASH_REDIS_URL
  const token = process.env.UPSTASH_REDIS_TOKEN

  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set')
  }

  _client = new Redis({ url, token })
  return _client
}

// ─── Session blocklist (for logout) ──────────────────────────────────────────
// JWTs can't be invalidated after signing, so we maintain a small blocklist
// for explicitly logged-out tokens. TTL matches JWT expiry (30 days).

const BLOCKLIST_TTL = 60 * 60 * 24 * 30

export async function blockToken(jti: string): Promise<void> {
  await getUpstash().set(`blocked:${jti}`, '1', { ex: BLOCKLIST_TTL })
}

export async function isTokenBlocked(jti: string): Promise<boolean> {
  const result = await getUpstash().get(`blocked:${jti}`)
  return result !== null
}

// ─── Event streaming ──────────────────────────────────────────────────────────
// Append-only list of StreamEvent JSON strings per job.
// Written by the orchestrator. Read by the SSE endpoint.

const EVENTS_TTL = 60 * 60 * 24 // 24 hours

export async function appendStreamEvent(jobId: string, event: object): Promise<void> {
  const key = `stream:${jobId}`
  await getUpstash().rpush(key, JSON.stringify(event))
  await getUpstash().expire(key, EVENTS_TTL)
}

export async function getStreamEvents(jobId: string, from: number): Promise<string[]> {
  return getUpstash().lrange(`stream:${jobId}`, from, -1)
}

export async function getStreamLength(jobId: string): Promise<number> {
  return getUpstash().llen(`stream:${jobId}`)
}
