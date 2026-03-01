import { inngest } from '@/lib/inngest'
import { getJob, recordRun } from '@/lib/jobs'
import { getArtifact } from '@/lib/redis'
import { runJob } from '@/lib/orchestrator'

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
      if (job.status === 'paused' || job.status === 'complete') {
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
