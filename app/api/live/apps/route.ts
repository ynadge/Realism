import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getUserLiveApps } from '@/lib/live-apps'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apps = await getUserLiveApps(userId)
  return NextResponse.json({ apps, userId })
}
