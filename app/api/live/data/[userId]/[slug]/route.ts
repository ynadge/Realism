import { NextRequest, NextResponse } from 'next/server'
import { getDataPlan, getCachedData, setCachedData } from '@/lib/live-apps'
import { executeAllFetches } from '@/lib/live-data-executor'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; slug: string }> }
) {
  const { userId, slug } = await params

  if (!userId || !slug) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const plan = await getDataPlan(userId, slug)
  if (!plan) {
    return NextResponse.json(
      { error: 'App not found or data plan missing' },
      { status: 404 }
    )
  }

  const cached = await getCachedData(userId, slug)
  if (cached) {
    return NextResponse.json(
      { ...cached, cached: true },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }

  const result = await executeAllFetches(plan)

  await setCachedData(userId, slug, result, plan.cacheTTL)

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
