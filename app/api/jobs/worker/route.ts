import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobs'
import { runJob } from '@/lib/orchestrator'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  let body: { jobId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' })
  }

  const { jobId } = body
  if (!jobId) {
    return NextResponse.json({ ok: false, error: 'jobId required' })
  }

  const job = await getJob(jobId)
  if (!job) {
    return NextResponse.json({ ok: false, error: 'Job not found' })
  }
  if (job.status !== 'pending' && job.status !== 'running') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    await runJob(job)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) })
  }
}
