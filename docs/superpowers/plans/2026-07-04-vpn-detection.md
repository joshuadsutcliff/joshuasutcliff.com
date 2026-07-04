# VPN Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flag hosting/VPN-class visits via a build-time GeoLite2-ASN lookup in a first-party tracking proxy, surfaced as Umami `vpn-visit` events and a stat card on /admin.

**Architecture:** A build script fetches the ASN db (license key env). The `/u/api/send` rewrite retargets to `api/track.ts`, which classifies the visitor IP in-process, forwards the payload to Umami unchanged (preserving UA + geo header), and fires a same-session `vpn-visit` event on a VPN verdict. Fail-open everywhere. Stats endpoint + panel gain a VPN count.

**Tech Stack:** `maxmind` npm (pure JS reader), GeoLite2-ASN (build-time download), existing serverless patterns.

## Global Constraints

- No em dashes (U+2014) anywhere (pre-commit hook).
- Public repo: no secrets; the mmdb is NOT committed (gitignored); `MAXMIND_LICENSE_KEY` lives only in Vercel env.
- ESM RULE: api/** relative imports carry `.js` extensions.
- FAIL-OPEN INVARIANT: `api/track.ts` must forward the pageview to Umami even when the db is missing, the lookup throws, or classification fails. Tracking can never break because of this feature.
- Bundle guard: live `index-*.js` is 259,505 B and must stay within ~1 KB (the only client change is one stat card in the Admin page, which lives in the index chunk: expect a few hundred bytes growth, still within guard).
- Build gate per commit: `npm run build` + `npm test` green. Runtime-faithful api check where api files change: `npx tsc --noEmit --ignoreConfig --strict --esModuleInterop --skipLibCheck --module nodenext --moduleResolution nodenext <changed api files> api/_lib/session.ts` clean.
- Push only at the final task (auth-switch workflow).
- Existing interfaces: `UMAMI_API_URL` env; Umami send endpoint `POST {UMAMI_API_URL}/api/send` with payload `{type, payload:{website,url,hostname,language,screen,...}}`; Umami parses the request `User-Agent` (unrealistic UAs are bot-dropped) and reads the client IP from the `x-vercel-forwarded-for` header (its `CLIENT_IP_HEADER`).

---

### Task 1: ASN db fetch script + build wiring

**Files:**
- Create: `scripts/fetch-asn-db.mjs`
- Modify: `package.json` (build script), `.gitignore` (+ mmdb)

**Interfaces:**
- Produces: `api/_lib/GeoLite2-ASN.mmdb` at build time when `MAXMIND_LICENSE_KEY` is set; warn-and-skip when absent. Consumed by Task 3.

- [ ] **Step 1: Write `scripts/fetch-asn-db.mjs`**

```js
// Fetches MaxMind GeoLite2-ASN at build time into api/_lib/GeoLite2-ASN.mmdb.
// Requires MAXMIND_LICENSE_KEY (Vercel build env). Absent key: warn + skip (fail-open,
// api/track.ts degrades to pass-through). Present key + bad download: fail the build.
import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, statSync, copyFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const key = process.env.MAXMIND_LICENSE_KEY
const OUT = 'api/_lib/GeoLite2-ASN.mmdb'
if (!key) {
  console.warn('fetch-asn-db: MAXMIND_LICENSE_KEY not set, skipping (track.ts will pass through)')
  process.exit(0)
}
const tmp = mkdtempSync(join(tmpdir(), 'asn-'))
const url = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-ASN&license_key=${key}&suffix=tar.gz`
execSync(`curl -sfL -o ${join(tmp, 'asn.tar.gz')} "${url}"`, { stdio: ['ignore', 'inherit', 'inherit'] })
execSync(`tar -xzf ${join(tmp, 'asn.tar.gz')} -C ${tmp}`)
const dir = readdirSync(tmp).find((d) => d.startsWith('GeoLite2-ASN_'))
if (!dir) throw new Error('fetch-asn-db: extracted directory not found')
const src = join(tmp, dir, 'GeoLite2-ASN.mmdb')
if (!existsSync(src) || statSync(src).size < 1_000_000) throw new Error('fetch-asn-db: mmdb missing or too small')
copyFileSync(src, OUT)
console.log(`fetch-asn-db: wrote ${OUT} (${statSync(OUT).size} bytes)`)
```

- [ ] **Step 2: Wire the build + gitignore**

In `package.json`: `"build": "node scripts/fetch-asn-db.mjs && tsc -b && vite build"`. Append to `.gitignore`: `api/_lib/GeoLite2-ASN.mmdb`.

- [ ] **Step 3: Verify**: `npm run build` locally (no key set) prints the warn-skip line and the build still passes; `npm test` 10/10.

- [ ] **Step 4: Commit**: `git add scripts/fetch-asn-db.mjs package.json .gitignore && git commit -m "feat: build-time GeoLite2-ASN fetch (fail-open)"`

### Task 2: Classifier (TDD)

**Files:**
- Create: `api/_lib/vpn-classify.ts`
- Test: `api/_lib/vpn-classify.test.ts`

**Interfaces:**
- Produces: `classifyAsn(asn: number, org: string): boolean` (true = hosting/VPN-class). Exported constants `VPN_ASNS: Set<number>` and `HOSTING_KEYWORDS: RegExp`. Consumed by Task 3.

- [ ] **Step 1: Failing test `api/_lib/vpn-classify.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { classifyAsn } from './vpn-classify'

describe('classifyAsn', () => {
  it('flags a known VPN ASN regardless of org string', () => {
    expect(classifyAsn(9009, 'M247 Europe SRL')).toBe(true)
  })
  it('flags hosting keywords', () => {
    expect(classifyAsn(14061, 'DIGITALOCEAN-ASN')).toBe(true)
    expect(classifyAsn(16509, 'AMAZON-02')).toBe(true)
    expect(classifyAsn(212238, 'Datacamp Limited')).toBe(true)
  })
  it('does not flag residential ISPs', () => {
    expect(classifyAsn(7922, 'COMCAST-7922')).toBe(false)
    expect(classifyAsn(22773, 'ASN-CXA-ALL-CCI-22773-RDC')).toBe(false)
  })
  it('handles empty org', () => {
    expect(classifyAsn(0, '')).toBe(false)
  })
})
```

- [ ] **Step 2: RED**: `npx vitest run api/_lib/vpn-classify.test.ts` fails (cannot resolve).

- [ ] **Step 3: Implement `api/_lib/vpn-classify.ts`**

```ts
// Heuristic hosting/VPN-class network classifier. Maintainable: extend either list.
export const VPN_ASNS = new Set<number>([
  9009, // M247 (Nord/Surfshark/many)
  212238, // Datacamp / CDN77
  60068, // Datacamp
  16247, // M247 alt
  136787, // TEFINCOM (NordVPN)
  205119, // Tzulo/VPN infra
  40676, // Psychz
  46562, // Performive/Total Server
  199524, // G-Core
  20473, // Vultr/Choopa
])

export const HOSTING_KEYWORDS =
  /hosting|host(?:ed)?[ -]?(?:service|solution)|datacenter|data[ -]center|colo(?:cation)?|\bvpn\b|proxy|server|cloud|amazon|aws|google[ -]?cloud|gcp|microsoft|azure|digitalocean|linode|akamai|ovh|hetzner|vultr|leaseweb|contabo|choopa|m247|datacamp|packet|scaleway|oracle/i

export function classifyAsn(asn: number, org: string): boolean {
  if (VPN_ASNS.has(asn)) return true
  if (!org) return false
  return HOSTING_KEYWORDS.test(org)
}
```

- [ ] **Step 4: GREEN**: 4/4 (suite 14/14). `npm run build` PASS.

- [ ] **Step 5: Commit**: `git add api/_lib/vpn-classify.ts api/_lib/vpn-classify.test.ts && git commit -m "feat: hosting/VPN ASN classifier"`

### Task 3: Tracking proxy + rewrite retarget

**Files:**
- Create: `api/track.ts`
- Modify: `vercel.json` (retarget `/u/api/send` rewrite to `/api/track`; add `functions` includeFiles for the mmdb)

**Interfaces:**
- Consumes: `classifyAsn` from `./_lib/vpn-classify.js`; the mmdb (optional at runtime); `UMAMI_API_URL` env.
- Produces: `POST /api/track` behaving exactly like Umami's `/api/send` from the browser's perspective.

- [ ] **Step 1: Implement `api/track.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { classifyAsn } from './_lib/vpn-classify.js'

type AsnReader = { get: (ip: string) => { autonomous_system_number?: number; autonomous_system_organization?: string } | null }
let readerPromise: Promise<AsnReader | null> | null = null

function dbPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '_lib', 'GeoLite2-ASN.mmdb')
}

async function getReader(): Promise<AsnReader | null> {
  readerPromise ??= (async () => {
    try {
      const p = dbPath()
      if (!existsSync(p)) return null
      const { open } = await import('maxmind')
      return (await open(p)) as unknown as AsnReader
    } catch (err) {
      console.error('track: asn db load failed:', err instanceof Error ? err.message : String(err))
      return null
    }
  })()
  return readerPromise
}

function clientIp(req: VercelRequest): string {
  const real = req.headers['x-real-ip']
  if (typeof real === 'string' && real) return real
  const fwd = req.headers['x-forwarded-for']
  const first = (Array.isArray(fwd) ? fwd[0] : fwd ?? '').split(',')[0].trim()
  return first
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const base = process.env.UMAMI_API_URL
  if (!base) return res.status(502).json({ error: 'not configured' })

  const body = typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : null
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : ''
  const ip = clientIp(req)

  const fwdHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  if (ua) fwdHeaders['User-Agent'] = ua
  if (ip) fwdHeaders['x-vercel-forwarded-for'] = ip

  let upstreamStatus = 502
  let upstreamBody = ''
  try {
    const r = await fetch(`${base}/api/send`, {
      method: 'POST',
      headers: fwdHeaders,
      body: JSON.stringify(body ?? {}),
    })
    upstreamStatus = r.status
    upstreamBody = await r.text()
  } catch (err) {
    console.error('track: umami forward failed:', err instanceof Error ? err.message : String(err))
    return res.status(502).send('upstream unavailable')
  }

  // Best-effort VPN classification + companion event. Never affects the response.
  try {
    const payload = body?.payload as Record<string, unknown> | undefined
    const isPageview = body?.type === 'event' && payload && typeof payload.website === 'string' && !payload.name
    if (isPageview && ip) {
      const reader = await getReader()
      const rec = reader?.get(ip)
      if (rec && classifyAsn(rec.autonomous_system_number ?? 0, rec.autonomous_system_organization ?? '')) {
        void fetch(`${base}/api/send`, {
          method: 'POST',
          headers: fwdHeaders,
          body: JSON.stringify({
            type: 'event',
            payload: {
              website: payload.website,
              url: payload.url,
              hostname: payload.hostname,
              language: payload.language,
              screen: payload.screen,
              name: 'vpn-visit',
              data: {
                asn: rec.autonomous_system_number ?? 0,
                org: rec.autonomous_system_organization ?? '',
              },
            },
          }),
        }).catch(() => {})
      }
    }
  } catch (err) {
    console.error('track: classify failed:', err instanceof Error ? err.message : String(err))
  }

  res.status(upstreamStatus).send(upstreamBody)
}
```

Note: Umami's tracker sends pageviews as `{type:'event', payload:{...}}` WITHOUT a `name` field; named custom events carry `name`. The `isPageview` check reflects that.

- [ ] **Step 2: Install the reader dep**: `npm install maxmind`

- [ ] **Step 3: Retarget the rewrite + include the db file in the function**

In `vercel.json`, change the `/u/api/send` rewrite destination from the Umami URL to `"/api/track"`, and add:

```json
  "functions": {
    "api/track.ts": { "includeFiles": "api/_lib/GeoLite2-ASN.mmdb" }
  }
```

Keep `/u/script.js` rewrite and everything else unchanged.

- [ ] **Step 4: Verify**: `npm run build` PASS (warn-skip without key), `npm test` 14/14, and `npx tsc --noEmit --ignoreConfig --strict --esModuleInterop --skipLibCheck --module nodenext --moduleResolution nodenext api/track.ts api/_lib/vpn-classify.ts api/_lib/session.ts` clean.

- [ ] **Step 5: Commit**: `git add api/track.ts vercel.json package.json package-lock.json && git commit -m "feat: first-party tracking proxy with VPN classification"`

### Task 4: VPN stat surfacing

**Files:**
- Modify: `api/admin/stats.ts` (add `vpnVisits`)
- Modify: `src/pages/Admin.tsx` (fourth stat card)

**Interfaces:**
- Produces: stats response gains `vpnVisits: number`; the Stats tab shows a "VPN visits" card.

- [ ] **Step 1: In `api/admin/stats.ts`**, add an events query to the existing `Promise.all` and response:

Add to the destructuring array a fifth call: `umamiGet(base, \`/api/websites/${site}/metrics?type=event&limit=50&${q}\`)` destructured as `events`, then compute before the return:

```ts
    const vpnVisits = (Array.isArray(events) ? (events as Array<{ x: string | null; y: number }>) : []).find(
      (e) => e.x === 'vpn-visit',
    )?.y ?? 0
```

and include `vpnVisits` in the JSON: `return res.status(200).json({ range, stats, pages, referrers, active, vpnVisits })`.

- [ ] **Step 2: In `src/pages/Admin.tsx`**, extend the `Stats` type with `vpnVisits?: number`, change the stat-card grid from `sm:grid-cols-3` to `sm:grid-cols-4`, and add after the "Live now" card:

```tsx
        <Card label="VPN visits" value={data?.vpnVisits ?? 0} />
```

- [ ] **Step 3: Verify**: build PASS, tests 14/14, api tsc check clean (stats.ts + session.ts), bundle: index chunk grows only by the card markup (must stay within ~1 KB of 259,505 B; report exact size).

- [ ] **Step 4: Commit**: `git add api/admin/stats.ts src/pages/Admin.tsx && git commit -m "feat: VPN visits stat"`

### Task 5: Deploy + E2E

- [ ] **Step 1 (owner, already done per session): `MAXMIND_LICENSE_KEY` in Vercel (Production + Preview, build-time).** Confirm it exists before pushing.
- [ ] **Step 2: Push** (auth-switch), wait for deploy. Check the Vercel build log line `fetch-asn-db: wrote ...` (proves the key worked; a warn-skip line means the env var is missing: stop and fix).
- [ ] **Step 3: Live checks**: `/u/script.js` 200; a pageview through `/u/api/send` returns Umami's normal response and appears in Umami realtime WITH city intact (proves header forwarding); index chunk within guard.
- [ ] **Step 4: VPN probe**: send a realistic-UA pageview from the seedbox's AirVPN egress (`ssh josh@100.75.134.80 'docker exec qbittorrent curl ... https://www.joshuasutcliff.com/u/api/send ...'`) and verify a `vpn-visit` event appears in Umami (events metric) and `/admin` shows VPN visits >= 1 for 24h.
- [ ] **Step 5: Negative probe**: a pageview from the home connection (residential Comcast) must NOT increment vpn-visit.
- [ ] **Step 6: Docs**: vault website note gains a VPN-detection bullet (mechanism, accuracy contract, MAXMIND_LICENSE_KEY location, fail-open behavior).
