import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createHash, timingSafeEqual } from 'node:crypto'
import { signSession, type SessionRole } from '../_lib/session.js'

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
  const fwdRaw = req.headers['x-forwarded-for']
  const fwd = Array.isArray(fwdRaw) ? (fwdRaw[0] ?? '') : (fwdRaw ?? '')
  const ip = fwd.split(',')[0].trim() || 'unknown'
  if (throttled(ip)) return res.status(429).json({ error: 'too many attempts' })

  const adminPassword = process.env.ADMIN_PASSWORD
  const viewerPassword = process.env.VIEWER_PASSWORD
  const secret = process.env.ADMIN_SECRET
  if (!adminPassword || !secret) return res.status(500).json({ error: 'server not configured' })

  let body: Record<string, unknown>
  try {
    body = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>
  } catch {
    return res.status(401).json({ error: 'invalid password' })
  }
  const password = body.password
  if (typeof password !== 'string') {
    return res.status(401).json({ error: 'invalid password' })
  }

  // Always run both comparisons so response timing does not reveal which
  // password a guess matched. safeEqual hashes both sides, so it is also
  // length-independent.
  const isAdmin = safeEqual(password, adminPassword)
  const isViewer = safeEqual(password, viewerPassword ?? '')
  const role: SessionRole | null = isAdmin ? 'admin' : isViewer && viewerPassword ? 'viewer' : null
  if (!role) {
    return res.status(401).json({ error: 'invalid password' })
  }

  const token = signSession(secret, role)
  res.setHeader(
    'Set-Cookie',
    `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 86_400}`,
  )
  return res.status(204).end()
}
