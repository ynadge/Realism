import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'

const PROTECTED_PREFIXES = ['/dashboard', '/job', '/live']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED_PREFIXES.some(prefix =>
    pathname.startsWith(prefix)
  )

  if (!isProtected) return NextResponse.next()

  const token = req.cookies.get('realism-session')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/?auth=required', req.url))
  }

  const userId = await validateSession(token)

  if (!userId) {
    const response = NextResponse.redirect(new URL('/?auth=required', req.url))
    response.cookies.delete('realism-session')
    return response
  }

  const response = NextResponse.next()
  response.headers.set('x-user-id', userId)
  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/job/:path*', '/live/:path*'],
}
