import { Redis } from '@upstash/redis'
import type { Job, SpendEvent, Artifact } from '@/types'

let _client: Redis | null = null

function getRedis(): Redis {
  if (_client) return _client

  const url = process.env.UPSTASH_REDIS_URL
  const token = process.env.UPSTASH_REDIS_TOKEN

  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be set')
  }

  _client = new Redis({ url, token })
  return _client
}

// ─── Key schema ───────────────────────────────────────────────────────────────

const keys = {
  job:         (id: string) =>     `job:${id}`,
  spendEvents: (jobId: string) =>  `spend:${jobId}`,
  artifact:    (jobId: string) =>  `artifact:${jobId}`,
  userJobs:    (userId: string) => `user:${userId}:jobs`,
}

const JOB_TTL = 60 * 60 * 24 * 90 // 90 days

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function getJob(id: string): Promise<Job | null> {
  return getRedis().get<Job>(keys.job(id))
}

export async function setJob(job: Job): Promise<void> {
  await Promise.all([
    getRedis().set(keys.job(job.id), job, { ex: JOB_TTL }),
    getRedis().sadd(keys.userJobs(job.userId), job.id),
  ])
}

export async function updateJob(id: string, partial: Partial<Job>): Promise<Job | null> {
  const existing = await getJob(id)
  if (!existing) return null
  const updated = { ...existing, ...partial }
  await setJob(updated)
  return updated
}

export async function getUserJobs(userId: string): Promise<Job[]> {
  const jobIds = await getRedis().smembers(keys.userJobs(userId)) as string[]
  if (!jobIds.length) return []
  const jobs = await Promise.all(jobIds.map(id => getJob(id)))
  return jobs.filter(Boolean) as Job[]
}

// ─── Spend Events ─────────────────────────────────────────────────────────────

export async function appendSpendEvent(event: SpendEvent): Promise<void> {
  await Promise.all([
    getRedis().rpush(keys.spendEvents(event.jobId), JSON.stringify(event)),
    getRedis().expire(keys.spendEvents(event.jobId), JOB_TTL),
  ])
}

export async function getSpendEvents(jobId: string): Promise<SpendEvent[]> {
  const raw = await getRedis().lrange(keys.spendEvents(jobId), 0, -1) as string[]
  return raw.map(item => {
    try { return typeof item === 'string' ? JSON.parse(item) : item }
    catch { return item }
  }) as SpendEvent[]
}

// ─── Artifacts ────────────────────────────────────────────────────────────────

export async function setArtifact(jobId: string, artifact: Artifact): Promise<void> {
  await getRedis().set(keys.artifact(jobId), artifact, { ex: JOB_TTL })
}

export async function getArtifact(jobId: string): Promise<Artifact | null> {
  return getRedis().get<Artifact>(keys.artifact(jobId))
}
