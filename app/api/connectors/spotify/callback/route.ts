import { NextRequest, NextResponse } from 'next/server'
import { setConnectorCredentials } from '@/lib/live-apps'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL('/dashboard?connector_error=spotify_denied', req.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard?connector_error=spotify_invalid', req.url)
    )
  }

  let userId: string
  let returnTo: string
  try {
    const decoded = Buffer.from(state, 'base64url').toString()
    const colonIndex = decoded.indexOf(':')
    userId = decoded.slice(0, colonIndex)
    returnTo = decoded.slice(colonIndex + 1) || '/dashboard'
  } catch {
    return NextResponse.redirect(
      new URL('/dashboard?connector_error=spotify_state', req.url)
    )
  }

  if (!userId) {
    return NextResponse.redirect(
      new URL('/dashboard?connector_error=spotify_state', req.url)
    )
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/dashboard?connector_error=spotify_config', req.url)
    )
  }

  let tokenData: {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/spotify/callback`,
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('[spotify/callback] Token exchange failed:', errText)
      return NextResponse.redirect(
        new URL('/dashboard?connector_error=spotify_token', req.url)
      )
    }

    tokenData = await tokenRes.json()
  } catch (err) {
    console.error('[spotify/callback] Token exchange error:', err)
    return NextResponse.redirect(
      new URL('/dashboard?connector_error=spotify_token', req.url)
    )
  }

  await setConnectorCredentials(userId, 'spotify', {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
  })

  const redirectUrl = new URL(returnTo, req.url)
  redirectUrl.searchParams.set('connector_connected', 'spotify')

  return NextResponse.redirect(redirectUrl)
}
