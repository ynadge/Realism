import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/jobs'
import { getStreamEvents } from '@/lib/redis'
import { validateSession } from '@/lib/auth'

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

  const from = parseInt(req.nextUrl.searchParams.get('from') ?? '0', 10)
  const events = await getStreamEvents(id, from)

  return NextResponse.json({
    events,
    nextIndex: from + events.length,
    status: job.status,
  })
}
