import { NextRequest, NextResponse } from 'next/server'
import { getJob, completeJob, failJob, recordRun } from '@/lib/jobs'
import { runOrchestratorStep } from '@/lib/orchestrator'
import { sapiomPublishMessage } from '@/lib/sapiom'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  let body: { jobId?: string; expectedIteration?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' })
  }

  const { jobId, expectedIteration } = body
  if (!jobId) {
    return NextResponse.json({ ok: false, error: 'jobId required' })
  }

  const job = await getJob(jobId)
  if (!job) {
    return NextResponse.json({ ok: false, error: 'Job not found' })
  }
  if (job.status !== 'running') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const result = await runOrchestratorStep(job, expectedIteration)

  if (result.done) {
    if (result.outcome === 'completed') {
      if (job.type === 'persistent') {
        await recordRun(jobId, result.artifact, 0)
      } else {
        await completeJob(jobId, result.artifact)
      }
    } else {
      await failJob(jobId, result.reason)
    }
    return NextResponse.json({ ok: true, done: true })
  }

  const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/worker`
  try {
    await sapiomPublishMessage(workerUrl, {
      jobId,
      expectedIteration: result.iteration,
    })
  } catch (err) {
    console.error(`[worker] Failed to enqueue next step for ${jobId}:`, err)
  }

  return NextResponse.json({ ok: true, done: false })
}
