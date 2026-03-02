import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { getDataPlan, setDataPlan, invalidateCache } from '@/lib/live-apps'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params

  let userContext: Record<string, string>
  try {
    const body = await req.json()
    userContext = body.userContext
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!userContext || typeof userContext !== 'object') {
    return NextResponse.json({ error: 'Invalid userContext' }, { status: 400 })
  }

  const plan = await getDataPlan(userId, slug)
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (plan.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await Promise.all([
    setDataPlan({ ...plan, userContext }),
    invalidateCache(userId, slug),
  ])

  return NextResponse.json({ ok: true })
}
