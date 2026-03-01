import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobs'
import { validateSession } from '@/lib/auth'
import { inngest } from '@/lib/inngest'

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

  await inngest.send({
    name: 'job/execute',
    data: { jobId },
  })

  return NextResponse.json({ ok: true, jobId })
}
