import { NextRequest, NextResponse } from 'next/server'
import { getJob, recordRun } from '@/lib/jobs'
import { getArtifact } from '@/lib/redis'
import { runJob } from '@/lib/orchestrator'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  let jobId: string | undefined

  try {
    const body = await req.json()
    jobId = body.jobId
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' })
  }

  if (!jobId) {
    return NextResponse.json({ ok: false, error: 'jobId required' })
  }

  const job = await getJob(jobId)
  if (!job) {
    return NextResponse.json({ ok: false, error: 'Job not found' })
  }
  if (job.type !== 'persistent') {
    return NextResponse.json({ ok: false, error: 'Not a persistent job' })
  }
  if (job.status === 'paused') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    await runJob(job)
    const artifact = await getArtifact(jobId)
    if (artifact) await recordRun(jobId, artifact, 0)
  } catch (err) {
    console.error(`[webhook] Job ${jobId} failed:`, err)
  }

  // Always 200 to prevent QStash retries
  return NextResponse.json({ ok: true })
}
