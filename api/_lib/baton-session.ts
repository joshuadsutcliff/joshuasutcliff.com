import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_TTL_MS = 7 * 86_400_000
const ROLE = 'baton'

// Shares ADMIN_SECRET with the admin session but uses the role literal
// 'baton', which the admin verifier rejects (and vice versa), so tokens
// are not interchangeable across the two surfaces.
export function signBatonSession(secret: string, now: number = Date.now()): string {
  const exp = now + SESSION_TTL_MS
  const payload = `${exp}.${ROLE}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifyBatonSession(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [expStr, role, sig] = parts
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < now || sig.length === 0) return false
  if (role !== ROLE) return false
  const expected = createHmac('sha256', secret).update(`${expStr}.${role}`).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
