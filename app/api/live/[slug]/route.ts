import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getLiveApp, deleteLiveApp } from '@/lib/live-apps'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const config = await getLiveApp(userId, slug)
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(config)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const config = await getLiveApp(userId, slug)
  if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (config.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await deleteLiveApp(userId, slug)
  return NextResponse.json({ ok: true })
}
