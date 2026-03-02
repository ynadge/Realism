import { Redis } from '@upstash/redis'
import { inngest } from '@/lib/inngest'
import { getJob, recordRun } from '@/lib/jobs'
import { getArtifact } from '@/lib/redis'
import { runJob } from '@/lib/orchestrator'
import { createLiveApp } from '@/lib/live-orchestrator'

let _redis: Redis | null = null
function getRedis() {
  if (_redis) return _redis
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  })
  return _redis
}

export const executeJob = inngest.createFunction(
  {
    id: 'execute-job',
    name: 'Execute Job',
    retries: 2,
    timeouts: {
      finish: '10m',
    },
  },
  { event: 'job/execute' },
  async ({ event, step }) => {
    const { jobId } = event.data

    await step.run('load-and-execute-job', async () => {
      const job = await getJob(jobId)
      if (!job) throw new Error(`Job ${jobId} not found`)
      if (job.status === 'complete') {
        return { skipped: true, reason: 'Job already complete' }
      }
      if (job.status !== 'pending' && job.status !== 'running') {
        return { skipped: true, reason: `Job status is ${job.status}` }
      }
      await runJob(job)
      return { ok: true }
    })

    return { jobId, completed: true }
  }
)

export const executeWebhookJob = inngest.createFunction(
  {
    id: 'execute-webhook-job',
    name: 'Execute Scheduled Job',
    retries: 1,
    timeouts: {
      finish: '10m',
    },
  },
  { event: 'job/webhook' },
  async ({ event, step }) => {
    const { jobId } = event.data

    await step.run('execute-scheduled-run', async () => {
      const job = await getJob(jobId)
      if (!job) throw new Error(`Job ${jobId} not found`)
      if (job.status === 'paused') {
        return { skipped: true }
      }

      await runJob(job)

      const artifact = await getArtifact(jobId)
      if (artifact) await recordRun(jobId, artifact, 0)

      return { ok: true }
    })

    return { jobId, completed: true }
  }
)

export const createLiveAppFunction = inngest.createFunction(
  {
    id: 'create-live-app',
    name: 'Create Live App',
    retries: 1,
    timeouts: { finish: '10m' },
  },
  { event: 'live/create' },
  async ({ event }) => {
    const { goal, userId } = event.data as { goal: string; userId: string }
    const eventId = event.id as string

    try {
      const result = await createLiveApp({ goal, userId })

      await getRedis().set(
        `live-creation:${userId}:${eventId}`,
        {
          status: 'complete',
          slug: result.slug,
          url: result.url,
          title: result.config.title,
        },
        { ex: 300 }
      )

      return { slug: result.slug, url: result.url }

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      await getRedis().set(
        `live-creation:${userId}:${eventId}`,
        { status: 'failed', error: message },
        { ex: 300 }
      )

      throw err
    }
  }
)
