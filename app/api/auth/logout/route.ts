import { NextRequest, NextResponse } from 'next/server'
import { destroySession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('realism-session')?.value

  if (token) {
    await destroySession(token)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete('realism-session')
  return response
}
