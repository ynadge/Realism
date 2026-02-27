import { NextResponse } from 'next/server'

// TODO: streaming orchestration via sapiom_chat
export async function POST() {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
