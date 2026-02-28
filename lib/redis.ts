import { createFetch } from '@sapiom/fetch'
import type { Job, SpendEvent, Artifact } from '@/types'

// ─── Transport layer ──────────────────────────────────────────────────────────
// Sapiom Redis is accessed via REST using the pipeline endpoint to avoid
// URL length limits when storing large values (e.g. jobs with embedded artifacts).
// Auth is handled by the @sapiom/fetch SDK (x402 payment protocol).

let _sapiomFetch: ReturnType<typeof createFetch> | null = null

function getFetch(): ReturnType<typeof createFetch> {
  if (_sapiomFetch) return _sapiomFetch

  const apiKey = process.env.SAPIOM_API_KEY
  if (!apiKey) throw new Error('SAPIOM_API_KEY is not set')
  if (!process.env.SAPIOM_REDIS_URL) throw new Error('SAPIOM_REDIS_URL is not set')

  _sapiomFetch = createFetch({ apiKey, serviceName: 'Data Redis', agentName: 'realism' })
  return _sapiomFetch
}

function getRedisUrl(): string {
  const url = process.env.SAPIOM_REDIS_URL
  if (!url) throw new Error('SAPIOM_REDIS_URL is not set')
  return url
}

async function redisCmd<T>(command: string, ...args: string[]): Promise<T> {
  const res = await getFetch()(`${getRedisUrl()}/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([[command.toUpperCase(), ...args]]),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)')
    throw new Error(`Redis ${command} failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  const first = Array.isArray(data) ? data[0] : data
  if (first?.error) throw new Error(`Redis ${command} error: ${first.error}`)
  return first?.result as T
}

async function redisSet(key: string, value: unknown, exSeconds?: number): Promise<void> {
  const serialized = JSON.stringify(value)
  if (exSeconds) {
    await redisCmd('SET', key, serialized, 'EX', String(exSeconds))
  } else {
    await redisCmd('SET', key, serialized)
  }
}

async function redisGet<T>(key: string): Promise<T | null> {
  const raw = await redisCmd<string | null>('GET', key)
  if (raw === null || raw === undefined) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    try { return JSON.parse(decodeURIComponent(raw)) as T } catch { /* ignore */ }
    return raw as unknown as T
  }
}

async function redisDel(key: string): Promise<void> {
  await redisCmd('DEL', key)
}

async function redisSadd(key: string, member: string): Promise<void> {
  await redisCmd('SADD', key, member)
}

async function redisSmembers(key: string): Promise<string[]> {
  const result = await redisCmd<string[]>('SMEMBERS', key)
  return result ?? []
}

async function redisRpush(key: string, value: string): Promise<void> {
  await redisCmd('RPUSH', key, value)
}

async function redisLrange(key: string, start: number, end: number): Promise<string[]> {
  const result = await redisCmd<string[]>('LRANGE', key, String(start), String(end))
  return result ?? []
}

async function redisExpire(key: string, seconds: number): Promise<void> {
  await redisCmd('EXPIRE', key, String(seconds))
}

// ─── Key schema ───────────────────────────────────────────────────────────────

const keys = {
  job:         (id: string) =>     `job:${id}`,
  spendEvents: (jobId: string) =>  `spend:${jobId}`,
  artifact:    (jobId: string) =>  `artifact:${jobId}`,
  userJobs:    (userId: string) => `user:${userId}:jobs`,
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

const JOB_TTL = 60 * 60 * 24 * 90 // 90 days

export async function getJob(id: string): Promise<Job | null> {
  return redisGet<Job>(keys.job(id))
}

export async function setJob(job: Job): Promise<void> {
  await redisSet(keys.job(job.id), job, JOB_TTL)
  await redisSadd(keys.userJobs(job.userId), job.id)
}

export async function updateJob(id: string, partial: Partial<Job>): Promise<Job | null> {
  const existing = await getJob(id)
  if (!existing) return null
  const updated = { ...existing, ...partial }
  await setJob(updated)
  return updated
}

export async function getUserJobs(userId: string): Promise<Job[]> {
  const jobIds = await redisSmembers(keys.userJobs(userId))
  if (!jobIds.length) return []
  const jobs = await Promise.all(jobIds.map(id => getJob(id)))
  return jobs.filter(Boolean) as Job[]
}

// ─── Spend Events ─────────────────────────────────────────────────────────────

export async function appendSpendEvent(event: SpendEvent): Promise<void> {
  await redisRpush(keys.spendEvents(event.jobId), JSON.stringify(event))
  await redisExpire(keys.spendEvents(event.jobId), JOB_TTL)
}

export async function getSpendEvents(jobId: string): Promise<SpendEvent[]> {
  const raw = await redisLrange(keys.spendEvents(jobId), 0, -1)
  return raw.map(item => {
    try {
      return typeof item === 'string' ? JSON.parse(item) : item
    } catch {
      return item
    }
  }) as SpendEvent[]
}

// ─── Artifacts ────────────────────────────────────────────────────────────────

export async function setArtifact(jobId: string, artifact: Artifact): Promise<void> {
  await redisSet(keys.artifact(jobId), artifact, JOB_TTL)
}

export async function getArtifact(jobId: string): Promise<Artifact | null> {
  return redisGet<Artifact>(keys.artifact(jobId))
}

// ─── Orchestrator State (background step execution) ──────────────────────────

const ORCHESTRATOR_TTL = 60 * 60

export async function setOrchestratorState(jobId: string, state: unknown): Promise<void> {
  await redisSet(`orchestrator:${jobId}`, state, ORCHESTRATOR_TTL)
}

export async function getOrchestratorState<T>(jobId: string): Promise<T | null> {
  return redisGet<T>(`orchestrator:${jobId}`)
}

export async function deleteOrchestratorState(jobId: string): Promise<void> {
  await redisDel(`orchestrator:${jobId}`)
}

// ─── Stream Events (polling-based delivery) ──────────────────────────────────

export async function appendStreamEvent(jobId: string, event: unknown): Promise<void> {
  await redisRpush(`events:${jobId}`, JSON.stringify(event))
  await redisExpire(`events:${jobId}`, JOB_TTL)
}

export async function getStreamEvents(jobId: string, fromIndex = 0): Promise<unknown[]> {
  const raw = await redisLrange(`events:${jobId}`, fromIndex, -1)
  return raw.map(item => {
    try {
      return typeof item === 'string' ? JSON.parse(item) : item
    } catch {
      return item
    }
  })
}
