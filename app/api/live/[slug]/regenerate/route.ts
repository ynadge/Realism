import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getDataPlan, getLiveApp, setLiveBundle, invalidateCache } from '@/lib/live-apps'
import { generateLiveApp, verifyDataPlan } from '@/lib/live-orchestrator'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params

  const [config, plan] = await Promise.all([
    getLiveApp(userId, slug),
    getDataPlan(userId, slug),
  ])

  if (!config || !plan) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (plan.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { sampleData } = await verifyDataPlan(plan)

  const html = await generateLiveApp(plan, sampleData, config.designPersonality)

  await Promise.all([
    setLiveBundle(userId, slug, html),
    invalidateCache(userId, slug),
  ])

  return NextResponse.json({ ok: true, slug })
}
