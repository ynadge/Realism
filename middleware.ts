import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TODO: auth session validation
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/job/:path*'],
}
