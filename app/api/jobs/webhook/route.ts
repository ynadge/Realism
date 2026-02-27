import { NextRequest, NextResponse } from 'next/server'
import { getJob, recordRun } from '@/lib/jobs'
import { runOrchestrator } from '@/lib/orchestrator'

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

  let artifact = null
  let spentThisRun = 0

  try {
    for await (const event of runOrchestrator(job)) {
      if (event.type === 'tool_call') spentThisRun += event.payload.cost
      if (event.type === 'artifact') artifact = event.payload
    }
  } catch (err) {
    console.error(`[webhook] Orchestrator error for job ${jobId}:`, err)
    return NextResponse.json({ ok: false, error: String(err) })
  }

  if (artifact) {
    try {
      await recordRun(jobId, artifact, spentThisRun)
    } catch (err) {
      console.error(`[webhook] recordRun failed for job ${jobId}:`, err)
    }
  }

  return NextResponse.json({ ok: true, spent: spentThisRun })
}
