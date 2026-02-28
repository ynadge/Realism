import { NextRequest, NextResponse } from 'next/server'
import { getJob, startJob } from '@/lib/jobs'
import { validateSession } from '@/lib/auth'
import { sapiomPublishMessage } from '@/lib/sapiom'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { jobId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { jobId } = body
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  const job = await getJob(jobId)
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (job.status !== 'pending') return NextResponse.json({ error: 'Job already started' }, { status: 409 })

  await startJob(jobId)

  const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/worker`
  try {
    await sapiomPublishMessage(workerUrl, { jobId, expectedIteration: 0 })
  } catch (err) {
    console.error(`[execute] Failed to enqueue job ${jobId}:`, err)
    return NextResponse.json({ error: 'Failed to start job processing.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, jobId })
}
