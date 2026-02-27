import { NextResponse } from 'next/server'

// TODO: classify goal, create job in Redis, create spend rule
export async function POST() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
