import { NextRequest, NextResponse } from 'next/server'
import { getJob, pauseJob } from '@/lib/jobs'
import { getSpendEvents, getArtifact } from '@/lib/redis'
import { validateSession } from '@/lib/auth'
import { sapiomDeleteSchedule } from '@/lib/sapiom'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const job = await getJob(id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [spendEvents, artifact] = await Promise.all([
    getSpendEvents(id),
    getArtifact(id),
  ])

  return NextResponse.json({ job, spendEvents, artifact })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const job = await getJob(id)
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (job.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (job.qstashScheduleId) {
    try {
      await sapiomDeleteSchedule(job.qstashScheduleId)
    } catch (err) {
      console.warn(`[jobs/${id}] Failed to delete QStash schedule (non-fatal):`, err)
    }
  }

  await pauseJob(id)
  return NextResponse.json({ ok: true })
}
