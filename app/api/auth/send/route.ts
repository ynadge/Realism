import { NextRequest, NextResponse } from 'next/server'
import { sapiomVerifySend, SapiomError } from '@/lib/sapiom'

const E164_REGEX = /^\+[1-9]\d{1,14}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { phone?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const phone = body.phone?.trim()
  const email = body.email?.trim().toLowerCase()

  if (!phone && !email) {
    return NextResponse.json(
      { error: 'Phone number or email is required.' },
      { status: 400 }
    )
  }

  let contactValue: string
  let preludeType: 'phone_number' | 'email_address'

  if (email) {
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 }
      )
    }
    contactValue = email
    preludeType = 'email_address'
  } else {
    if (!phone || !E164_REGEX.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format: +15551234567' },
        { status: 400 }
      )
    }
    contactValue = phone
    preludeType = 'phone_number'
  }

  try {
    const result = await sapiomVerifySend(contactValue, preludeType)
    console.log('[auth/send] Sapiom response:', JSON.stringify(result))

    if (!result.id) {
      console.error('[auth/send] Sapiom returned no verification ID:', result)
      return NextResponse.json(
        { error: 'Verification service did not return an ID. Please try again.' },
        { status: 502 }
      )
    }

    if (result.status === 'blocked') {
      const target = preludeType === 'email_address' ? email : phone
      console.warn('[auth/send] Prelude blocked delivery for:', target)
      return NextResponse.json(
        { error: 'Delivery was blocked. Please wait a few minutes and try again.' },
        { status: 429 }
      )
    }

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
