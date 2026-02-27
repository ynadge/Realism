import { randomUUID } from 'crypto'
import { setJob, getJob, updateJob } from '@/lib/redis'
import type { Job, JobType, JobCadence, Artifact } from '@/types'

export async function createJob(params: {
  id?: string
  userId: string
  goal: string
  budget: number
  type: JobType
  cadence?: JobCadence
  spendRuleId?: string
  qstashScheduleId?: string
}): Promise<Job> {
  const job: Job = {
    id: params.id ?? randomUUID(),
    userId: params.userId,
    goal: params.goal,
    budget: params.budget,
    type: params.type,
    status: 'pending',
    spendRuleId: params.spendRuleId,
    spendTotal: 0,
    cadence: params.cadence,
    qstashScheduleId: params.qstashScheduleId,
    createdAt: new Date().toISOString(),
  }

  await setJob(job)
  return job
}

export async function startJob(id: string): Promise<Job | null> {
  return updateJob(id, { status: 'running' })
}

export async function completeJob(id: string, artifact: Artifact): Promise<Job | null> {
  return updateJob(id, {
    status: 'complete',
    artifact,
    completedAt: new Date().toISOString(),
  })
}

export async function failJob(id: string, reason: string): Promise<Job | null> {
  return updateJob(id, {
    status: 'failed',
    failureReason: reason,
    completedAt: new Date().toISOString(),
  })
}

export async function addSpend(id: string, amount: number): Promise<Job | null> {
  const job = await getJob(id)
  if (!job) return null
  return updateJob(id, { spendTotal: job.spendTotal + amount })
}

export async function pauseJob(id: string): Promise<Job | null> {
  return updateJob(id, { status: 'paused' })
}

export async function recordRun(
  id: string,
  artifact: Artifact,
  spentThisRun: number
): Promise<Job | null> {
  const job = await getJob(id)
  if (!job) return null

  const now = new Date()
  const nextRun = job.cadence === 'daily'
    ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return updateJob(id, {
    artifact,
    lastRunAt: now.toISOString(),
    nextRunAt: nextRun.toISOString(),
    spendTotal: (job.spendTotal ?? 0) + spentThisRun,
    status: 'running',
  })
}

export { getJob }
