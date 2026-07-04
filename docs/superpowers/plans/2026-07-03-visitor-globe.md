# Visitor Globe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An interactive 3D globe tab on /admin showing visitor cities for a selectable window, fed by a session-gated geo endpoint.

**Architecture:** A committed city-coordinate lookup (generated from GeoNames) lets a new serverless endpoint translate Umami's city metrics into lat/lng points; the /admin page gains a Stats/Globe tab switch where the Globe tab lazy-loads globe.gl in its own chunk.

**Tech Stack:** globe.gl + three (lazy chunk), GeoNames cities15000 (build-time only), Vercel serverless (Node ESM), vitest.

## Global Constraints

- **No em dashes (U+2014) anywhere in this repo** (pre-commit hook).
- **Public repo: no secrets.** The geo endpoint reuses existing env vars only; no new secrets.
- **ESM RUNTIME RULE (learned the hard way):** the repo is `"type": "module"`; ALL relative imports in `api/**` MUST carry an explicit `.js` extension (e.g. `from '../_lib/session.js'`) or Vercel functions crash with FUNCTION_INVOCATION_FAILED. JSON imports in api/** use `createRequire` (see Task 3 code) to avoid import-attribute compatibility risk.
- **Main-bundle guard:** the public site's `index` chunk must NOT grow (globe.gl/three live in a lazy chunk loaded only inside the authenticated Globe tab). Verify by comparing `dist/assets/` before/after: `index-*.js` size unchanged within ~1 KB.
- Build gate: `npm run build` (tsc + vite) and `npm test` green before every commit.
- Push workflow: `gh auth switch --user joshuadsutcliff` → push → `gh auth switch --user brass458`. Deploy only at the final task.
- Existing interfaces consumed: `verifySession(token, secret, now?)` from `api/_lib/session.js`; `admin_session` cookie; env vars `ADMIN_SECRET`, `UMAMI_API_URL`, `UMAMI_USER`, `UMAMI_PASS`, `UMAMI_WEBSITE_ID`; Umami v2 metrics API (`type=city` returns entries whose `x` is the CITY NAME, plus we fetch `type=country`; city-to-country mapping comes from Umami session data via `type=city` NOT carrying country, so the endpoint ALSO queries the sessions weekly? NO: keep it simple, see Task 3: we query `type=city` and `type=country` separately and match cities to coordinates by name against all countries, preferring a match in one of the range's countries).

---

### Task 1: City-coordinate datasets + build script

**Files:**
- Create: `scripts/build-city-coords.mjs`
- Create (generated + committed): `api/_lib/city-coords.json`
- Create (generated + committed): `api/_lib/country-centroids.json`

**Interfaces:**
- Produces: `city-coords.json` = `{ "city name, CC": [lat, lng], ... }` (lowercased keys, ~10k entries, 2-decimal coords). `country-centroids.json` = `{ "CC": [lat, lng], ... }` (~250 entries). Consumed by Task 2.

- [ ] **Step 1: Write `scripts/build-city-coords.mjs`**

```js
// Builds api/_lib/city-coords.json and api/_lib/country-centroids.json.
// Source: GeoNames cities15000 dataset (https://download.geonames.org/export/dump/),
// licensed CC BY 4.0 (attribution: GeoNames, geonames.org). Run: node scripts/build-city-coords.mjs
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TOP_N = 10_000
const tmp = mkdtempSync(join(tmpdir(), 'geonames-'))
execSync(`curl -sL -o ${join(tmp, 'c.zip')} https://download.geonames.org/export/dump/cities15000.zip`)
execSync(`unzip -o -q ${join(tmp, 'c.zip')} -d ${tmp}`)

const rows = readFileSync(join(tmp, 'cities15000.txt'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const f = l.split('\t')
    return { name: f[1], lat: +f[4], lng: +f[5], cc: f[8], pop: +f[14] }
  })
  .sort((a, b) => b.pop - a.pop)
  .slice(0, TOP_N)

const cities = {}
for (const r of rows) {
  const key = `${r.name.toLowerCase()}, ${r.cc}`
  if (!(key in cities)) cities[key] = [+r.lat.toFixed(2), +r.lng.toFixed(2)]
}
writeFileSync('api/_lib/city-coords.json', JSON.stringify(cities))

// Country centroids: average the coords of each country's listed cities (adequate for fallback dots).
const byCc = {}
for (const r of rows) {
  ;(byCc[r.cc] ??= []).push([r.lat, r.lng])
}
const centroids = {}
for (const [cc, pts] of Object.entries(byCc)) {
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length
  centroids[cc] = [+lat.toFixed(2), +lng.toFixed(2)]
}
writeFileSync('api/_lib/country-centroids.json', JSON.stringify(centroids))
console.log(`cities: ${Object.keys(cities).length}, centroids: ${Object.keys(centroids).length}`)
```

- [ ] **Step 2: Run it and check size**

Run: `node scripts/build-city-coords.mjs && ls -la api/_lib/*.json`
Expected: ~10k cities, ~200+ centroids, city-coords.json well under 600 KB.

- [ ] **Step 3: Commit**

```bash
git add scripts/build-city-coords.mjs api/_lib/city-coords.json api/_lib/country-centroids.json
git commit -m "feat: bundled city/country coordinate datasets for the visitor globe"
```

### Task 2: Geo lookup library (TDD)

**Files:**
- Create: `api/_lib/geo-lookup.ts`
- Test: `api/_lib/geo-lookup.test.ts`

**Interfaces:**
- Produces: `lookupCity(city: string, country: string, cities: Record<string, [number, number]>, centroids: Record<string, [number, number]>): { lat: number; lng: number; exact: boolean } | null` (null = unmatched even after centroid fallback). Pure function; datasets injected so tests use fixtures. Consumed by Task 3.

- [ ] **Step 1: Write the failing test `api/_lib/geo-lookup.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { lookupCity } from './geo-lookup'

const cities: Record<string, [number, number]> = {
  'las cruces, US': [32.31, -106.78],
  'tokyo, JP': [35.69, 139.69],
}
const centroids: Record<string, [number, number]> = { US: [39.5, -98.35], JP: [36.2, 138.25] }

describe('lookupCity', () => {
  it('exact city match (case-insensitive)', () => {
    expect(lookupCity('Las Cruces', 'US', cities, centroids)).toEqual({ lat: 32.31, lng: -106.78, exact: true })
  })
  it('falls back to country centroid', () => {
    expect(lookupCity('Alamogordo', 'US', cities, centroids)).toEqual({ lat: 39.5, lng: -98.35, exact: false })
  })
  it('returns null when city and country are both unknown', () => {
    expect(lookupCity('Nowhere', 'XX', cities, centroids)).toBeNull()
  })
  it('handles empty/undefined-ish city input via centroid', () => {
    expect(lookupCity('', 'JP', cities, centroids)).toEqual({ lat: 36.2, lng: 138.25, exact: false })
  })
})
```

- [ ] **Step 2: Run to verify FAIL**: `npx vitest run api/_lib/geo-lookup.test.ts` (cannot resolve `./geo-lookup`).

- [ ] **Step 3: Implement `api/_lib/geo-lookup.ts`**

```ts
export function lookupCity(
  city: string,
  country: string,
  cities: Record<string, [number, number]>,
  centroids: Record<string, [number, number]>,
): { lat: number; lng: number; exact: boolean } | null {
  const key = `${(city || '').toLowerCase()}, ${country}`
  const hit = cities[key]
  if (hit) return { lat: hit[0], lng: hit[1], exact: true }
  const c = centroids[country]
  if (c) return { lat: c[0], lng: c[1], exact: false }
  return null
}
```

- [ ] **Step 4: Run to verify PASS**: 4/4 (suite total 10/10 with existing session tests).

- [ ] **Step 5: Commit**: `git add api/_lib/geo-lookup.ts api/_lib/geo-lookup.test.ts && git commit -m "feat: city coordinate lookup with centroid fallback"`

### Task 3: Geo endpoint

**Files:**
- Create: `api/admin/geo.ts`

**Interfaces:**
- Consumes: `verifySession` from `../_lib/session.js`; `lookupCity` from `../_lib/geo-lookup.js`; the two JSON datasets; the same env vars and Umami login/token-cache pattern as `api/admin/stats.ts`.
- Produces: `GET /api/admin/geo?range=24h|7d|30d` (default 7d) → `{ range, points: [{ city, country, lat, lng, visitors, exact }], unmatched: [{ city, country, visitors }] }`; 401 unauthenticated, 500 unconfigured, 502 Umami unreachable. Consumed by Task 4.

- [ ] **Step 1: Implement `api/admin/geo.ts`**

```ts
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
```

- [ ] **Step 2: Verify**: `npm run build` PASS, `npm test` 10/10, plus the runtime-faithful check: `npx tsc --noEmit --ignoreConfig --strict --esModuleInterop --skipLibCheck --resolveJsonModule --module nodenext --moduleResolution nodenext api/admin/geo.ts api/_lib/geo-lookup.ts api/_lib/session.ts` clean.

- [ ] **Step 3: Commit**: `git add api/admin/geo.ts && git commit -m "feat: session-gated visitor geo endpoint"`

### Task 4: Globe tab UI

**Files:**
- Create: `src/pages/AdminGlobe.tsx`
- Modify: `src/pages/Admin.tsx` (tab switch; keep all existing stats logic)
- Modify: `package.json` (+ `globe.gl` dependency)
- Create: `public/earth-night.jpg` (downloaded once from the three-globe repo assets, MIT-licensed; ~500 KB)

**Interfaces:**
- Consumes: `GET /api/admin/geo?range=` (Task 3 shape).
- Produces: a `Globe` tab on /admin, lazy-chunked.

- [ ] **Step 1: Install dep + fetch texture**

```bash
npm install globe.gl
curl -sL -o public/earth-night.jpg https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg
```

- [ ] **Step 2: Create `src/pages/AdminGlobe.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'

type GeoPoint = { city: string; country: string; lat: number; lng: number; visitors: number; exact: boolean }
type GeoData = { range: string; points: GeoPoint[]; unmatched: Array<{ city: string; country: string; visitors: number }> }

export default function AdminGlobe({ range }: { range: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<{ dispose?: () => void; instance?: unknown } | null>(null)
  const [data, setData] = useState<GeoData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function run() {
      setError('')
      let res: Response
      try {
        res = await fetch(`/api/admin/geo?range=${range}`)
      } catch {
        setError('Analytics backend unreachable.')
        return
      }
      if (!res.ok) {
        setError(res.status === 401 ? 'Session expired: reload and sign in.' : 'Analytics backend unreachable.')
        return
      }
      const geo = (await res.json()) as GeoData
      if (cancelled) return
      setData(geo)
      try {
        const { default: Globe } = await import('globe.gl')
        if (cancelled || !mountRef.current) return
        mountRef.current.innerHTML = ''
        const g = new Globe(mountRef.current)
          .globeImageUrl('/earth-night.jpg')
          .backgroundColor('rgba(0,0,0,0)')
          .width(mountRef.current.clientWidth)
          .height(480)
          .pointsData(geo.points)
          .pointLat('lat')
          .pointLng('lng')
          .pointAltitude((d: object) => 0.02 + Math.log10(1 + (d as GeoPoint).visitors) * 0.08)
          .pointRadius((d: object) => 0.35 + Math.log10(1 + (d as GeoPoint).visitors) * 0.3)
          .pointColor((d: object) => ((d as GeoPoint).exact ? '#06b6d4' : '#8b5cf6'))
          .pointLabel((d: object) => {
            const p = d as GeoPoint
            return `${p.city}, ${p.country}: ${p.visitors} visitor${p.visitors === 1 ? '' : 's'}`
          })
        g.controls().autoRotate = true
        g.controls().autoRotateSpeed = 0.6
        globeRef.current = { instance: g }
      } catch {
        setError('Globe failed to load.')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [range])

  return (
    <div className="mt-6">
      {error && <p className="text-sm text-purple">{error}</p>}
      {data && data.points.length === 0 && !error && (
        <p className="text-sm text-muted">No visitors in this window.</p>
      )}
      <div ref={mountRef} className="overflow-hidden rounded-xl border border-border bg-card" />
      {data && data.unmatched.length > 0 && (
        <p className="mt-3 font-mono text-xs text-dim">
          Unmapped: {data.unmatched.map((u) => `${u.city} (${u.visitors})`).join(', ')}
        </p>
      )}
      <p className="mt-2 font-mono text-xs text-dim">cyan = city-exact, purple = country-level</p>
    </div>
  )
}
```

- [ ] **Step 3: Add the tab switch in `src/pages/Admin.tsx`**

Add imports at the top:

```tsx
import { lazy, Suspense } from 'react'
const AdminGlobe = lazy(() => import('./AdminGlobe'))
```

Add tab state next to the existing state hooks: `const [view, setView] = useState<'stats' | 'globe'>('stats')`.

In the authenticated return, insert a view switcher row directly under the `<h1>` (above the range buttons, which stay shared by both views):

```tsx
      <div className="mt-4 flex gap-2">
        {(['stats', 'globe'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition-colors ${
              v === view ? 'border-border-bright bg-card-hover text-fg' : 'border-border text-muted hover:text-fg'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
```

Wrap the existing cards/lists section in `{view === 'stats' && (...)}` and add after it:

```tsx
      {view === 'globe' && (
        <Suspense fallback={<p className="mt-6 text-muted">Loading globe...</p>}>
          <AdminGlobe range={range} />
        </Suspense>
      )}
```

- [ ] **Step 4: Verify build + bundle guard**

Run: `npm run build && npm test`
Expected: PASS, 10/10. Then `ls -la dist/assets/`: an `index-*.js` roughly the same size as before (~256 KB gz) plus a NEW separate `AdminGlobe-*.js` chunk (globe.gl/three, large). If globe.gl landed in the index chunk, the lazy import is wrong: fix before committing.

- [ ] **Step 5: Commit**: `git add package.json package-lock.json src/pages/Admin.tsx src/pages/AdminGlobe.tsx public/earth-night.jpg && git commit -m "feat: visitor globe tab on /admin"`

### Task 5: Deploy + E2E verify

- [ ] **Step 1: Push (auth-switch workflow)**: `gh auth switch --user joshuadsutcliff && git push origin main && gh auth switch --user brass458`; wait for the deploy.
- [ ] **Step 2: Live checks**: `curl -s -o /dev/null -w "%{http_code}" https://www.joshuasutcliff.com/api/admin/geo` = 401 (unauthenticated); `/earth-night.jpg` = 200; main page still loads; `index-*.js` referenced by the live page unchanged in size vs pre-deploy (no globe code in it).
- [ ] **Step 3: Owner check (user)**: /admin → Globe tab: Las Cruces dot renders (known traffic), tooltip counts match Stats city numbers for the same range, drag/zoom/rotate work.
- [ ] **Step 4: Docs**: add the globe to the vault website note's analytics section (one bullet: Globe tab, geo endpoint, GeoNames datasets, lazy chunk).
