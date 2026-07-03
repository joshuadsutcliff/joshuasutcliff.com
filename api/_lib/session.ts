import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_TTL_MS = 7 * 86_400_000

export function signSession(secret: string, now: number = Date.now()): string {
  const exp = now + SESSION_TTL_MS
  const sig = createHmac('sha256', secret).update(String(exp)).digest('hex')
  return `${exp}.${sig}`
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const expStr = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < now || sig.length === 0) return false
  const expected = createHmac('sha256', secret).update(expStr).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
