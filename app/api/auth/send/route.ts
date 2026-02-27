import { NextRequest, NextResponse } from 'next/server'
import { sapiomVerifySend, SapiomError } from '@/lib/sapiom'

const E164_REGEX = /^\+[1-9]\d{1,14}$/

export async function POST(req: NextRequest) {
  let body: { phone?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const phone = body.phone?.trim()

  if (!phone || !E164_REGEX.test(phone)) {
    return NextResponse.json(
      { error: 'Invalid phone number format. Use E.164 format: +15551234567' },
      { status: 400 }
    )
  }

  try {
    const result = await sapiomVerifySend(phone)
    return NextResponse.json({ verificationId: result.id })
  } catch (err) {
    if (err instanceof SapiomError && err.status === 429) {
      return NextResponse.json(
        { error: 'Too many attempts. Please wait before trying again.' },
        { status: 429 }
      )
    }

    console.error('[auth/send] Sapiom Verify error:', err)
    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    )
  }
}
