import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { Redis } from '@upstash/redis'

let _redis: Redis | null = null
function getRedis() {
  if (_redis) return _redis
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  })
  return _redis
}

export type LiveCreationStatus =
  | { status: 'pending' }
  | { status: 'complete'; slug: string; url: string; title: string }
  | { status: 'failed'; error: string }

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId } = await params
  if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

  const key = `live-creation:${userId}:${eventId}`
  const result = await getRedis().get<LiveCreationStatus>(key)

  if (!result) {
    return NextResponse.json({ status: 'pending' })
  }

  return NextResponse.json(result)
}
