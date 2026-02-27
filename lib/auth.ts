import { setSession, getSession, deleteSession } from '@/lib/redis'
import type { Session } from '@/types'

// Web Crypto API — works in both Node.js and edge runtimes.
// Avoids importing Node.js `crypto` module which breaks middleware edge runtime.

async function hashUserId(phone: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(phone)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export async function getUserIdFromPhone(phone: string): Promise<string> {
  return hashUserId(phone)
}

export async function createSession(phone: string): Promise<string> {
  const token = crypto.randomUUID()
  const userId = await getUserIdFromPhone(phone)
  const now = new Date()
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const session: Session = {
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  }

  await setSession(token, session)
  return token
}

export async function validateSession(token: string): Promise<string | null> {
  if (!token) return null

  const session = await getSession(token)
  if (!session) return null

  if (new Date(session.expiresAt) < new Date()) {
    await deleteSession(token)
    return null
  }

  return session.userId
}

export async function destroySession(token: string): Promise<void> {
  await deleteSession(token)
}
