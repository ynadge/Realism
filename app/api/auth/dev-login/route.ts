import { NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'

const COOKIE_NAME = 'realism-session'
const THIRTY_DAYS = 60 * 60 * 24 * 30
const DEV_PHONE = '+10000000000'

function isBypassEnabled(): boolean {
  return process.env.DEV_AUTH_BYPASS === 'true'
}

export async function GET() {
  if (!isBypassEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ available: true })
}

export async function POST() {
  if (!isBypassEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const token = await createSession(DEV_PHONE)

  const response = NextResponse.json({ success: true })
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: THIRTY_DAYS,
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
