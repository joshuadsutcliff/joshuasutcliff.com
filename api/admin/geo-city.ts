import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifySession } from '../_lib/session.js'

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
  let r = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${cachedToken}` } })
  if (r.status === 401) {
    cachedToken = await umamiLogin(base)
    r = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${cachedToken}` } })
  }
  if (!r.ok) throw new Error(`umami ${path}: ${r.status}`)
  return r.json()
}

type UmamiStats = { pageviews?: { value: number }; visitors?: { value: number } }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || !verifySession(req.cookies?.admin_session, secret)) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const base = process.env.UMAMI_API_URL
  const site = process.env.UMAMI_WEBSITE_ID
  if (!base || !site) return res.status(500).json({ error: 'server not configured' })

  const cityParam = req.query.city
  const city = typeof cityParam === 'string' ? cityParam.trim() : ''
  if (!city) return res.status(400).json({ error: 'city required' })

  const rangeParam = req.query.range
  const range = typeof rangeParam === 'string' && RANGES[rangeParam] ? rangeParam : '7d'
  const endAt = Date.now()
  const startAt = endAt - RANGES[range]
  const q = `startAt=${startAt}&endAt=${endAt}&city=${encodeURIComponent(city)}`
  const metric = (t: string) => `/api/websites/${site}/metrics?type=${t}&limit=5&${q}`

  try {
    const [stats, pages, browsers, os, devices, referrers] = (await Promise.all([
      umamiGet(base, `/api/websites/${site}/stats?${q}`),
      umamiGet(base, metric('url')),
      umamiGet(base, metric('browser')),
      umamiGet(base, metric('os')),
      umamiGet(base, metric('device')),
      umamiGet(base, metric('referrer')),
    ])) as [UmamiStats, unknown, unknown, unknown, unknown, unknown]

    return res.status(200).json({
      range,
      city,
      stats: {
        visitors: stats.visitors?.value ?? 0,
        pageviews: stats.pageviews?.value ?? 0,
      },
      pages,
      browsers,
      os,
      devices,
      referrers,
    })
  } catch (err) {
    console.error('umami geo-city proxy failure:', err instanceof Error ? err.message : String(err))
    return res.status(502).json({ error: 'analytics backend unreachable' })
  }
}
