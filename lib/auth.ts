import { SignJWT, jwtVerify } from 'jose'
import { blockToken, isTokenBlocked } from '@/lib/upstash'

export type ContactType = 'phone' | 'email'

function getJwtSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error(
      'NEXTAUTH_SECRET is not set. Add it to Vercel Environment Variables.'
    )
  }
  return new TextEncoder().encode(secret)
}

const JWT_EXPIRY = '30d'
const ALGORITHM = 'HS256'

// Web Crypto API for hashing — required because this module is imported by
// middleware.ts (edge runtime), which cannot load Node's crypto module.
async function hashUserId(contact: string): Promise<string> {
  const data = new TextEncoder().encode(contact)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export async function getUserIdFromContact(contact: string): Promise<string> {
  return hashUserId(contact)
}

/** @deprecated Use getUserIdFromContact */
export const getUserIdFromPhone = getUserIdFromContact

export async function createSession(
  contact: string,
  contactType: ContactType = 'phone'
): Promise<string> {
  const userId = await getUserIdFromContact(contact)
  const jti = crypto.randomUUID()

  const token = await new SignJWT({ userId, contact, contactType })
    .setProtectedHeader({ alg: ALGORITHM })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecret())

  return token
}

export async function validateSession(token: string): Promise<string | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getJwtSecret())

    if (payload.jti && await isTokenBlocked(payload.jti)) return null

    return payload.userId as string
  } catch {
    return null
  }
}

export async function destroySession(token: string): Promise<void> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (payload.jti) await blockToken(payload.jti)
  } catch {
    // Token already invalid
  }
}
