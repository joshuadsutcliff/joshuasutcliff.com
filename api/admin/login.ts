import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHash, timingSafeEqual } from 'node:crypto'
import { signSession } from '../_lib/session'

const LIMIT = 10
const WINDOW_MS = 15 * 60_000
const attempts = new Map<string, { count: number; resetAt: number }>()

function throttled(ip: string): boolean {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || rec.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  rec.count += 1
  return rec.count > LIMIT
}

function safeEqual(a: string, b: string): boolean {
  const da = createHash('sha256').update(a).digest()
  const db = createHash('sha256').update(b).digest()
  return timingSafeEqual(da, db)
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }
  const fwd = (req.headers['x-forwarded-for'] as string | undefined) ?? ''
  const ip = fwd.split(',')[0].trim() || 'unknown'
  if (throttled(ip)) return res.status(429).json({ error: 'too many attempts' })

  const expected = process.env.ADMIN_PASSWORD
  const secret = process.env.ADMIN_SECRET
  if (!expected || !secret) return res.status(500).json({ error: 'server not configured' })

  const body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>
  const password = body.password
  if (typeof password !== 'string' || !safeEqual(password, expected)) {
    return res.status(401).json({ error: 'invalid password' })
  }

  const token = signSession(secret)
  res.setHeader(
    'Set-Cookie',
    `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 86_400}`,
  )
  return res.status(204).end()
}
