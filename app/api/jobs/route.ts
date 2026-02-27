import { NextRequest, NextResponse } from 'next/server'
import { getUserJobs } from '@/lib/redis'
import { validateSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobs = await getUserJobs(userId)

  const priority: Record<string, number> = {
    running: 0,
    pending: 1,
    complete: 2,
    paused: 3,
    failed: 4,
  }

  const sorted = jobs.sort((a, b) => {
    const pa = priority[a.status] ?? 5
    const pb = priority[b.status] ?? 5
    if (pa !== pb) return pa - pb
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return NextResponse.json({ jobs: sorted })
}
