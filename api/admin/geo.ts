import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createRequire } from 'node:module'
import { verifySession } from '../_lib/session.js'
import { lookupCity } from '../_lib/geo-lookup.js'

const require = createRequire(import.meta.url)
const CITIES = require('../_lib/city-coords.json') as Record<string, [number, number]>
const CENTROIDS = require('../_lib/country-centroids.json') as Record<string, [number, number]>

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

type Metric = { x: string | null; y: number }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.ADMIN_SECRET
  const role = secret ? verifySession(req.cookies?.admin_session, secret) : null
  if (!role) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' })
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
    const [cityMetrics, countryMetrics] = (await Promise.all([
      umamiGet(base, `/api/websites/${site}/metrics?type=city&limit=500&${q}`),
      umamiGet(base, `/api/websites/${site}/metrics?type=country&limit=500&${q}`),
    ])) as [Metric[], Metric[]]

    const rangeCountries = countryMetrics.map((m) => m.x).filter((x): x is string => !!x)
    const points: Array<{ city: string; country: string; lat: number; lng: number; visitors: number; exact: boolean }> = []
    const unmatched: Array<{ city: string; country: string; visitors: number }> = []

    for (const m of cityMetrics) {
      const city = m.x ?? ''
      if (!city) continue
      // Umami city metrics carry no country; try the range's countries in order of volume.
      let placed = false
      for (const cc of rangeCountries) {
        const hit = lookupCity(city, cc, CITIES, CENTROIDS)
        if (hit?.exact) {
          points.push({ city, country: cc, lat: hit.lat, lng: hit.lng, visitors: m.y, exact: true })
          placed = true
          break
        }
      }
      if (!placed) {
        const cc = rangeCountries[0] ?? ''
        const fallback = cc ? lookupCity(city, cc, CITIES, CENTROIDS) : null
        if (fallback) {
          points.push({ city, country: cc, lat: fallback.lat, lng: fallback.lng, visitors: m.y, exact: false })
        } else {
          unmatched.push({ city, country: cc, visitors: m.y })
        }
      }
    }
    return res.status(200).json({ range, points, unmatched })
  } catch (err) {
    console.error('umami geo proxy failure:', err instanceof Error ? err.message : String(err))
    return res.status(502).json({ error: 'analytics backend unreachable' })
  }
}
