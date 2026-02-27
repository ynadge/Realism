import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'
import { classifyGoal } from '@/lib/classifier'
import { createJob } from '@/lib/jobs'
import { sapiomCreateSpendRule } from '@/lib/sapiom'
import type { JobCadence } from '@/types'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = await validateSession(token)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { goal?: string; budget?: number; cadence?: JobCadence }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { goal, budget, cadence } = body

  if (!goal || typeof goal !== 'string' || goal.trim().length === 0) {
    return NextResponse.json({ error: 'Goal is required.' }, { status: 400 })
  }
  if (goal.trim().length > 500) {
    return NextResponse.json({ error: 'Goal must be 500 characters or fewer.' }, { status: 400 })
  }
  if (budget === undefined || typeof budget !== 'number' || budget < 0.25 || budget > 10) {
    return NextResponse.json({ error: 'Budget must be between $0.25 and $10.00.' }, { status: 400 })
  }
  if (cadence !== undefined && cadence !== 'daily' && cadence !== 'weekly') {
    return NextResponse.json({ error: 'Cadence must be daily or weekly.' }, { status: 400 })
  }

  let type: 'one-shot' | 'persistent'
  try {
    type = await classifyGoal(goal.trim())
  } catch {
    type = 'one-shot'
  }

  if (type === 'persistent' && !cadence) {
    return NextResponse.json(
      { error: 'This goal looks like it needs a schedule. Choose daily or weekly.', needsCadence: true },
      { status: 400 }
    )
  }

  const jobId = crypto.randomUUID()

  let spendRuleId: string | undefined
  try {
    const spendRule = await sapiomCreateSpendRule(jobId, budget)
    spendRuleId = spendRule.id
  } catch (err) {
    // Non-fatal: orchestrator enforces budget in its own loop.
    // Spending rule is an extra safety net, not a hard dependency.
    console.warn('[jobs/create] Spending rule creation failed (non-fatal):', err)
  }

  try {
    const job = await createJob({
      id: jobId,
      userId,
      goal: goal.trim(),
      budget,
      type,
      cadence,
      spendRuleId,
    })

    return NextResponse.json({ jobId: job.id, type: job.type })
  } catch (err) {
    console.error('[jobs/create] Failed to create job:', err)
    return NextResponse.json({ error: 'Failed to create job.' }, { status: 500 })
  }
}
