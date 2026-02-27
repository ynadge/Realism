import { randomUUID, createHash } from 'crypto'
import { setSession, getSession, deleteSession } from '@/lib/redis'
import type { Session } from '@/types'

function hashUserId(phone: string): string {
  return createHash('sha256').update(phone).digest('hex').slice(0, 16)
}

export function getUserIdFromPhone(phone: string): string {
  return hashUserId(phone)
}

export async function createSession(phone: string): Promise<string> {
  const token = randomUUID()
  const userId = getUserIdFromPhone(phone)
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
