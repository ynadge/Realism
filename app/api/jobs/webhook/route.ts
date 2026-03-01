import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest'

export async function POST(req: NextRequest) {
  let jobId: string | undefined

  try {
    const body = await req.json()
    jobId = body.jobId
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  try {
    await inngest.send({
      name: 'job/webhook',
      data: { jobId },
    })
  } catch (err) {
    console.error('[webhook] Failed to send Inngest event:', err)
  }

  // Always 200 to prevent QStash retries
  return NextResponse.json({ ok: true })
}
