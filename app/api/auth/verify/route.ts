import { NextRequest, NextResponse } from 'next/server'
import { sapiomVerifyCheck, SapiomError } from '@/lib/sapiom'
import { createSession } from '@/lib/auth'

const COOKIE_NAME = 'realism-session'
const THIRTY_DAYS = 60 * 60 * 24 * 30

export async function POST(req: NextRequest) {
  let body: { verificationId?: string; code?: string; phone?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const { verificationId, code, phone } = body

  if (!verificationId || !code) {
    return NextResponse.json(
      { error: 'verificationId and code are required.' },
      { status: 400 }
    )
  }

  if (!phone) {
    return NextResponse.json(
      { error: 'phone is required.' },
      { status: 400 }
    )
  }

  if (!/^\d{4,8}$/.test(code)) {
    return NextResponse.json(
      { error: 'Code must be 4-8 digits.' },
      { status: 400 }
    )
  }

  try {
    const result = await sapiomVerifyCheck(verificationId, code)

    if (result.status === 'success') {
      const token = await createSession(phone)

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

    if (result.status === 'failure') {
      return NextResponse.json(
        { error: 'Invalid code.' },
        { status: 400 }
      )
    }

    // 'pending' or unexpected status
    return NextResponse.json(
      { error: 'Verification still pending. Please try again.' },
      { status: 400 }
    )
  } catch (err) {
    if (err instanceof SapiomError) {
      if (err.status === 410) {
        return NextResponse.json(
          { error: 'Code expired. Request a new one.' },
          { status: 400 }
        )
      }
      if (err.status === 422) {
        return NextResponse.json(
          { error: 'Invalid code.' },
          { status: 400 }
        )
      }
      if (err.status === 429) {
        return NextResponse.json(
          { error: 'Too many attempts. Please wait before trying again.' },
          { status: 429 }
        )
      }
    }

    console.error('[auth/verify] Sapiom Verify error:', err)
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    )
  }
}
