import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) return NextResponse.json({ ok: false }, { status: 401 })

  const userId = await validateSession(token)
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 })

  return NextResponse.json({ ok: true })
}
