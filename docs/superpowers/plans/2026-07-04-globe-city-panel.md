# Globe City Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clickable city list beside the /admin globe with fly-to selection and per-city visitor detail; rotation pauses on interaction.

**Architecture:** One new serverless endpoint (`api/admin/geo-city`) proxying Umami's city-filtered stats/metrics; AdminGlobe gains a side panel + selection state and correct OrbitControls rotation behavior. All UI stays in the existing lazy chunk.

**Tech Stack:** Existing stack only (globe.gl already installed).

## Global Constraints

- No em dashes (U+2014) anywhere (pre-commit hook).
- Public repo: no secrets; existing env vars only.
- ESM RULE: api/** relative imports carry `.js` extensions; JSON via createRequire (no JSON needed here).
- Bundle guard: live `index-*.js` is 259,505 bytes; must stay within ~1 KB. New UI code belongs to the lazy AdminGlobe chunk.
- Build gate per commit: `npm run build` and `npm test` (10/10) green.
- Runtime-faithful api type-check: `npx tsc --noEmit --ignoreConfig --strict --esModuleInterop --skipLibCheck --module nodenext --moduleResolution nodenext api/admin/geo-city.ts api/_lib/session.ts` clean.
- Push only at the final task (auth-switch workflow).
- Existing interfaces: `verifySession` from `../_lib/session.js`; cookie `admin_session`; env `ADMIN_SECRET`, `UMAMI_API_URL`, `UMAMI_USER`, `UMAMI_PASS`, `UMAMI_WEBSITE_ID`; `GET /api/admin/geo` returns `points: [{city,country,lat,lng,visitors,exact}]`.

---

### Task 1: Per-city detail endpoint

**Files:**
- Create: `api/admin/geo-city.ts`

**Interfaces:**
- Produces: `GET /api/admin/geo-city?city=<name>&range=24h|7d|30d` returning `{ range, city, stats: { visitors, pageviews }, pages, browsers, os, devices, referrers }` (lists are `[{x, y}]`, limit 5). 401 unauthenticated, 400 missing city, 500 unconfigured, 502 backend failure. Consumed by Task 2.

- [ ] **Step 1: Implement `api/admin/geo-city.ts`**

```ts
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
```

- [ ] **Step 2: Verify**: `npm run build` PASS, `npm test` 10/10, and the runtime-faithful tsc command from Global Constraints exits clean.

- [ ] **Step 3: Commit**: `git add api/admin/geo-city.ts && git commit -m "feat: per-city visitor detail endpoint"`

### Task 2: Panel UI + selection + rotation behavior

**Files:**
- Create: `src/pages/CityPanel.tsx`
- Modify: `src/pages/AdminGlobe.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/geo-city?city=&range=` (Task 1 shape); existing geo `points`.
- Produces: side panel with fly-to selection; rotation pause/resume.

- [ ] **Step 1: Create `src/pages/CityPanel.tsx`**

```tsx
import { useEffect, useState } from 'react'

export type GeoPoint = { city: string; country: string; lat: number; lng: number; visitors: number; exact: boolean }
type Metric = { x: string | null; y: number }
type CityDetail = {
  range: string
  city: string
  stats: { visitors: number; pageviews: number }
  pages: Metric[]
  browsers: Metric[]
  os: Metric[]
  devices: Metric[]
  referrers: Metric[]
}

function DetailList({ title, items }: { title: string; items: Metric[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((m) => (
          <li key={m.x ?? '(none)'} className="flex justify-between gap-3 text-xs">
            <span className="truncate text-muted">{m.x ?? '(none)'}</span>
            <span className="shrink-0 font-mono text-fg">{m.y}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CityPanel({
  points,
  range,
  selected,
  onSelect,
}: {
  points: GeoPoint[]
  range: string
  selected: GeoPoint | null
  onSelect: (p: GeoPoint | null) => void
}) {
  const [detail, setDetail] = useState<CityDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setError('')
    if (!selected) return
    setLoading(true)
    ;(async () => {
      let res: Response
      try {
        res = await fetch(`/api/admin/geo-city?city=${encodeURIComponent(selected.city)}&range=${range}`)
      } catch {
        if (!cancelled) {
          setError('Detail unavailable.')
          setLoading(false)
        }
        return
      }
      if (!res.ok) {
        if (!cancelled) {
          setError('Detail unavailable.')
          setLoading(false)
        }
        return
      }
      const d = (await res.json()) as CityDetail
      if (!cancelled) {
        setDetail(d)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selected, range])

  const sorted = [...points].sort((a, b) => b.visitors - a.visitors)

  return (
    <div className="max-h-[480px] overflow-y-auto rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-dim">Cities</p>
      {sorted.length === 0 && <p className="mt-2 text-sm text-muted">No visitors in this window.</p>}
      <ul className="mt-2 space-y-1">
        {sorted.map((p) => {
          const isSel = selected?.city === p.city && selected?.country === p.country
          return (
            <li key={`${p.city}|${p.country}`}>
              <button
                onClick={() => onSelect(isSel ? null : p)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  isSel ? 'border-border-bright bg-card-hover text-fg' : 'border-transparent text-muted hover:bg-card-hover hover:text-fg'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${p.exact ? 'bg-cyan' : 'bg-purple'}`} />
                  <span className="truncate">
                    {p.city}
                    <span className="ml-1 font-mono text-xs text-dim">{p.country}</span>
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-fg">{p.visitors}</span>
              </button>
              {isSel && (
                <div className="mb-2 ml-4 mt-1 rounded-lg border border-border bg-bg2 p-3">
                  {loading && <p className="text-xs text-muted">Loading...</p>}
                  {error && <p className="text-xs text-purple">{error}</p>}
                  {detail && (
                    <>
                      <p className="font-mono text-xs text-fg">
                        {detail.stats.visitors} visitor{detail.stats.visitors === 1 ? '' : 's'}, {detail.stats.pageviews} view
                        {detail.stats.pageviews === 1 ? '' : 's'}
                      </p>
                      <DetailList title="Pages" items={detail.pages} />
                      <DetailList title="Browsers" items={detail.browsers} />
                      <DetailList title="OS" items={detail.os} />
                      <DetailList title="Devices" items={detail.devices} />
                      <DetailList title="Referrers" items={detail.referrers} />
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Rework `src/pages/AdminGlobe.tsx`**

Replace the whole file with:

```tsx
import { useEffect, useRef, useState } from 'react'
import CityPanel, { type GeoPoint } from './CityPanel'

type GeoData = { range: string; points: GeoPoint[]; unmatched: Array<{ city: string; country: string; visitors: number }> }

type GlobeInst = {
  _destructor?: () => void
  pointOfView: (pov: { lat: number; lng: number; altitude: number }, ms?: number) => void
  pointsData: (d: object[]) => void
  controls: () => {
    autoRotate: boolean
    autoRotateSpeed: number
    addEventListener: (ev: string, cb: () => void) => void
  }
}

export default function AdminGlobe({ range }: { range: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeInst | null>(null)
  const selectedRef = useRef<GeoPoint | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [data, setData] = useState<GeoData | null>(null)
  const [selected, setSelected] = useState<GeoPoint | null>(null)
  const [error, setError] = useState('')

  selectedRef.current = selected

  function pointStyle(g: GlobeInst, points: GeoPoint[]) {
    g.pointsData(points.map((p) => ({ ...p })))
  }

  function handleSelect(p: GeoPoint | null) {
    setSelected(p)
    selectedRef.current = p
    const g = globeRef.current
    if (!g) return
    if (p) {
      g.controls().autoRotate = false
      g.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.2 }, 1000)
    } else {
      g.controls().autoRotate = true
    }
    if (data) pointStyle(g, data.points)
  }

  useEffect(() => {
    let cancelled = false
    async function run() {
      setError('')
      let res: Response
      try {
        res = await fetch(`/api/admin/geo?range=${range}`)
      } catch {
        if (!cancelled) setError('Analytics backend unreachable.')
        return
      }
      if (!res.ok) {
        if (!cancelled) setError(res.status === 401 ? 'Session expired: reload and sign in.' : 'Analytics backend unreachable.')
        return
      }
      const geo = (await res.json()) as GeoData
      if (cancelled) return
      setData(geo)
      setSelected(null)
      selectedRef.current = null
      try {
        const { default: Globe } = await import('globe.gl')
        if (cancelled || !mountRef.current) return
        globeRef.current?._destructor?.()
        mountRef.current.innerHTML = ''
        const g = new Globe(mountRef.current)
          .globeImageUrl('/earth-night.jpg')
          .backgroundColor('rgba(0,0,0,0)')
          .width(mountRef.current.clientWidth)
          .height(480)
          .pointLat('lat')
          .pointLng('lng')
          .pointAltitude((d: object) => {
            const p = d as GeoPoint
            const sel = selectedRef.current
            const bump = sel && sel.city === p.city && sel.country === p.country ? 0.06 : 0
            return 0.02 + Math.log10(1 + p.visitors) * 0.08 + bump
          })
          .pointRadius((d: object) => {
            const p = d as GeoPoint
            const sel = selectedRef.current
            const bump = sel && sel.city === p.city && sel.country === p.country ? 0.25 : 0
            return 0.35 + Math.log10(1 + p.visitors) * 0.3 + bump
          })
          .pointColor((d: object) => {
            const p = d as GeoPoint
            const sel = selectedRef.current
            if (sel && sel.city === p.city && sel.country === p.country) return '#ffffff'
            return p.exact ? '#06b6d4' : '#8b5cf6'
          })
          .pointLabel((d: object) => {
            const p = d as GeoPoint
            return `${p.city}, ${p.country}: ${p.visitors} visitor${p.visitors === 1 ? '' : 's'}`
          }) as unknown as GlobeInst
        g.pointsData(geo.points.map((p) => ({ ...p })))
        const controls = g.controls()
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.6
        controls.addEventListener('start', () => {
          controls.autoRotate = false
          if (idleTimer.current) clearTimeout(idleTimer.current)
        })
        controls.addEventListener('end', () => {
          if (idleTimer.current) clearTimeout(idleTimer.current)
          idleTimer.current = setTimeout(() => {
            if (!selectedRef.current) controls.autoRotate = true
          }, 10_000)
        })
        globeRef.current = g
      } catch {
        if (!cancelled) setError('Globe failed to load.')
      }
    }
    void run()
    return () => {
      cancelled = true
      if (idleTimer.current) clearTimeout(idleTimer.current)
      globeRef.current?._destructor?.()
      globeRef.current = null
    }
  }, [range])

  return (
    <div className="mt-6">
      {error && <p className="text-sm text-purple">{error}</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div ref={mountRef} className="overflow-hidden rounded-xl border border-border bg-card" />
        </div>
        <CityPanel points={data?.points ?? []} range={range} selected={selected} onSelect={handleSelect} />
      </div>
      {data && data.unmatched.length > 0 && (
        <p className="mt-3 font-mono text-xs text-dim">
          Unmapped: {data.unmatched.map((u) => `${u.city} (${u.visitors})`).join(', ')}
        </p>
      )}
      <p className="mt-2 font-mono text-xs text-dim">cyan = city-exact, purple = country-level, white = selected</p>
    </div>
  )
}
```

Notes: point accessors read `selectedRef` so a selection only needs `pointsData` re-set (new object identities) to restyle; the globe itself is NOT recreated on selection. Rotation: interaction pauses via the `start` listener; `end` arms a 10 s resume unless a city is selected.

- [ ] **Step 3: Verify**: `npm run build` PASS, `npm test` 10/10; bundle guard: `ls -la dist/assets/` shows `index-*.js` unchanged (~259,505 B) and the AdminGlobe chunk grown modestly (panel code), globe.gl chunk unchanged.

- [ ] **Step 4: Commit**: `git add src/pages/CityPanel.tsx src/pages/AdminGlobe.tsx && git commit -m "feat: city panel with fly-to selection and rotation pause"`

### Task 3: Deploy + verify

- [ ] **Step 1: Push** (auth-switch workflow), wait for deploy.
- [ ] **Step 2: Live checks**: `/api/admin/geo-city` returns 401 without session and 400 semantics require session (verify 401 ordering: unauthenticated first); index chunk byte-size unchanged; tracker/stats/geo endpoints unaffected.
- [ ] **Step 3: Owner check**: click a city: camera flies, dot turns white, detail renders (pages/browsers/OS/devices/referrers); drag pauses rotation, resumes ~10 s after idle when nothing selected.
- [ ] **Step 4: Docs**: extend the vault website note's globe bullet with the panel + rotation behavior.
