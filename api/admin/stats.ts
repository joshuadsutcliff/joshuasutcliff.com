import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifySession } from '../_lib/session'

const RANGES: Record<string, number> = {
  '24h': 86_400_000,
  '7d': 7 * 86_400_000,
  '30d': 30 * 86_400_000,
}

let cachedToken: string | null = null

async function umamiLogin(base: string): Promise<string> {
  const r = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.UMAMI_USER,
      password: process.env.UMAMI_PASS,
    }),
  })
  if (!r.ok) throw new Error(`umami login: ${r.status}`)
  const data = (await r.json()) as { token: string }
  return data.token
}

async function umamiGet(base: string, path: string): Promise<unknown> {
  cachedToken ??= await umamiLogin(base)
  let r = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${cachedToken}` },
  })
  if (r.status === 401) {
    cachedToken = await umamiLogin(base)
    r = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${cachedToken}` },
    })
  }
  if (!r.ok) throw new Error(`umami ${path}: ${r.status}`)
  return r.json()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || !verifySession(req.cookies?.admin_session, secret)) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const base = process.env.UMAMI_API_URL
  const site = process.env.UMAMI_WEBSITE_ID
  if (!base || !site) return res.status(500).json({ error: 'server not configured' })

  const rangeParam = req.query.range
  const range = typeof rangeParam === 'string' && RANGES[rangeParam] ? rangeParam : '7d'
  const endAt = Date.now()
  const startAt = endAt - RANGES[range]
  const q = `startAt=${startAt}&endAt=${endAt}`

  try {
    const [stats, pages, referrers, active] = await Promise.all([
      umamiGet(base, `/api/websites/${site}/stats?${q}`),
      umamiGet(base, `/api/websites/${site}/metrics?type=url&limit=10&${q}`),
      umamiGet(base, `/api/websites/${site}/metrics?type=referrer&limit=10&${q}`),
      umamiGet(base, `/api/websites/${site}/active`),
    ])
    return res.status(200).json({ range, stats, pages, referrers, active })
  } catch (err) {
    console.error('umami stats proxy failure:', err instanceof Error ? err.message : String(err))
    return res.status(502).json({ error: 'analytics backend unreachable' })
  }
}
