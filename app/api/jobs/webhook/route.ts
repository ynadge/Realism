import { NextRequest, NextResponse } from 'next/server'
import { getJob, startJob } from '@/lib/jobs'
import { sapiomPublishMessage } from '@/lib/sapiom'

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

  await startJob(jobId)

  const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/worker`
  try {
    await sapiomPublishMessage(workerUrl, { jobId, expectedIteration: 0 })
  } catch (err) {
    console.error(`[webhook] Failed to enqueue job ${jobId}:`, err)
    return NextResponse.json({ ok: false, error: 'Failed to enqueue' })
  }

  return NextResponse.json({ ok: true })
}
