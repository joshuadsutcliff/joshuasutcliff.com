import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_TTL_MS = 7 * 86_400_000

export type SessionRole = 'admin' | 'viewer'

const ROLES: readonly string[] = ['admin', 'viewer']

export function signSession(secret: string, role: SessionRole, now: number = Date.now()): string {
  const exp = now + SESSION_TTL_MS
  const payload = `${exp}.${role}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): SessionRole | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [expStr, role, sig] = parts
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < now || sig.length === 0) return null
  if (!ROLES.includes(role)) return null
  const expected = createHmac('sha256', secret).update(`${expStr}.${role}`).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return role as SessionRole
}
