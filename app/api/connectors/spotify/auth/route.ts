import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('realism-session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/?auth=required', req.url))
  }

  const userId = await validateSession(token)
  if (!userId) {
    return NextResponse.redirect(new URL('/?auth=required', req.url))
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'Spotify is not configured on this server' },
      { status: 503 }
    )
  }

  const returnTo = req.nextUrl.searchParams.get('returnTo') ?? '/dashboard'
  const state = Buffer.from(`${userId}:${returnTo}`).toString('base64url')

  const scopes = [
    'user-top-read',
    'user-read-recently-played',
    'user-read-private',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/connectors/spotify/callback`,
    scope: scopes,
    state,
  })

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`
  )
}
