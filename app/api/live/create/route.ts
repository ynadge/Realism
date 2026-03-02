import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { inngest } from '@/lib/inngest'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let goal: string
  try {
    const body = await req.json()
    goal = body.goal?.trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!goal || goal.length < 10) {
    return NextResponse.json({ error: 'Goal too short' }, { status: 400 })
  }

  if (goal.length > 500) {
    return NextResponse.json({ error: 'Goal too long (max 500 chars)' }, { status: 400 })
  }

  const { ids } = await inngest.send({
    name: 'live/create',
    data: { goal, userId },
  })

  return NextResponse.json({
    ok: true,
    eventId: ids[0],
    message: 'Creating your app...',
  })
}
