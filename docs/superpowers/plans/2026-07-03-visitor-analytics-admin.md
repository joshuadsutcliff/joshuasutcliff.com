# Visitor Analytics + Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-hosted Umami analytics collecting visitor + page data for joshuasutcliff.com, surfaced in Umami's dashboard and in a password-protected `/admin` panel on the site.

**Architecture:** Umami + Postgres run as a new compose project on the home-lab Monitoring VM, exposed publicly through the existing Cloudflare tunnel. The site loads the tracker first-party via `vercel.json` rewrites. The `/admin` SPA route authenticates against a Vercel serverless function (signed httpOnly cookie) and reads stats through a serverless proxy that holds all Umami credentials in env vars.

**Tech Stack:** Umami v2 (Docker, Postgres 16), Cloudflare tunnel, Vite + React 19 + Tailwind v4, Vercel serverless functions (Node, `@vercel/node`), vitest.

## Global Constraints

- **No em dashes (U+2014) anywhere in this repo.** A pre-commit hook blocks them. Use commas, colons, periods.
- **Public repo: no secrets, ever.** Passwords/API tokens live only in Vercel env vars or `~/umami/.env` on the VM. Credentials for the vault go ONLY in the gitignored `homelab-monitoring-secrets` note.
- **Substitution tokens:** `<HOMELAB_DOMAIN>` = the home-lab public domain (find it in the vault note `Areas/Personal/HomeLab/homelab-monitoring.md`; same domain the ntfy/requests hosts use). `<WEBSITE_ID>` = the Umami website UUID produced in Task 2. Substitute real values when editing files; never write the real domain into THIS plan doc or the spec.
- **Monitoring VM (`ssh josh@monitoring`, Tailscale):** docker runs WITHOUT sudo (docker group), but AppArmor blocks `docker stop/restart/rm`. Creating a NEW compose project with `docker compose up -d` is unaffected. There is NO passwordless sudo; nothing in this plan needs root on the VM.
- **All container images version-pinned** (stack policy; no bare `:latest`).
- **Push workflow:** `gh auth switch --user joshuadsutcliff` before `git push origin main`, then `gh auth switch --user brass458`. Vercel auto-deploys `main` (~1 min).
- Repo build gate: `npm run build` (tsc + vite) must pass before every commit that touches site code.

---

### Task 1: Umami + Postgres on the Monitoring VM

**Files:**
- Create (on VM): `/home/josh/umami/docker-compose.yml`
- Create (on VM): `/home/josh/umami/.env` (mode 0600, never committed anywhere)

**Interfaces:**
- Produces: container `umami` listening on port 3000 on the `monitoring_default` Docker network (reachable by container name from cloudflared). No host port published.

- [ ] **Step 1: Resolve the current Umami release tag**

Run: `curl -s https://api.github.com/repos/umami-software/umami/releases/latest | grep '"tag_name"'`
Expected: a tag like `"v2.x.y"`. Use `ghcr.io/umami-software/umami:postgresql-v2.x.y` below (replace with the actual version).

- [ ] **Step 2: Create the compose project on the VM**

Write `/home/josh/umami/docker-compose.yml` (via ssh heredoc):

```yaml
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-v2.x.y
    container_name: umami
    environment:
      DATABASE_URL: postgresql://umami:${DB_PASSWORD}@umami-db:5432/umami
      DATABASE_TYPE: postgresql
      APP_SECRET: ${APP_SECRET}
      CLIENT_IP_HEADER: cf-connecting-ip
    depends_on:
      umami-db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - default
      - monitoring_default

  umami-db:
    image: postgres:16-alpine
    container_name: umami-db
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./db-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U umami']
      interval: 10s
      timeout: 5s
      retries: 10
    restart: unless-stopped

networks:
  monitoring_default:
    external: true
```

Notes: `umami` joins `monitoring_default` declaratively (recreate-safe, per stack doctrine); the db stays on the project-default network only. `CLIENT_IP_HEADER` makes visitor IPs/geo correct behind the Cloudflare tunnel.

- [ ] **Step 3: Create the env file with generated secrets**

```bash
ssh josh@monitoring 'umask 077 && printf "DB_PASSWORD=%s\nAPP_SECRET=%s\n" "$(openssl rand -hex 24)" "$(openssl rand -hex 32)" > ~/umami/.env && chmod 600 ~/umami/.env && ls -la ~/umami/.env'
```

Expected: `-rw------- 1 josh josh`. Do not print the contents.

- [ ] **Step 4: Start and verify**

```bash
ssh josh@monitoring 'cd ~/umami && docker compose up -d'
ssh josh@monitoring 'sleep 20 && docker exec umami curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/heartbeat'
```

Expected: both containers `running`, heartbeat returns `200`. If `umami` restarts on boot loop, check `docker logs umami` for DB connection errors (wait for db health; do NOT `docker restart`, use `docker start` if needed).

### Task 2: Umami first-run setup (admin password, website entry)

**Interfaces:**
- Consumes: running `umami` container from Task 1.
- Produces: `<WEBSITE_ID>` (UUID) for joshuasutcliff.com; changed admin password; both recorded in the vault secrets note.

- [ ] **Step 1: Log in with default credentials and capture a token**

Umami ships with user `admin`, password `umami`. From the VM (inside the docker network, never over the public internet with defaults live):

```bash
ssh josh@monitoring 'docker exec umami curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"umami\"}"'
```

Expected: JSON containing `"token"`. Keep it in a shell variable in subsequent commands; do not echo it into logs.

- [ ] **Step 2: Change the admin password immediately**

Generate a strong password (`openssl rand -base64 18`), then:

```bash
# inside the same ssh session, with $TOK and $NEWPASS set
docker exec umami curl -s -X POST http://localhost:3000/api/me/password \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"umami\",\"newPassword\":\"$NEWPASS\"}"
```

Expected: 200. Record username `admin` + the new password in the vault note `homelab-monitoring-secrets` (gitignored) under a new "Umami" heading.

- [ ] **Step 3: Create the website entry and capture `<WEBSITE_ID>`**

```bash
docker exec umami curl -s -X POST http://localhost:3000/api/websites \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"name":"joshuasutcliff.com","domain":"joshuasutcliff.com"}'
```

Expected: JSON with `"id":"<uuid>"`. That UUID is `<WEBSITE_ID>`; record it beside the credentials in the secrets note (it is not secret, but keep it with the rest).

- [ ] **Step 4: Verify the stats API shape**

```bash
docker exec umami curl -s "http://localhost:3000/api/websites/<WEBSITE_ID>/stats?startAt=0&endAt=$(date +%s)000" -H "Authorization: Bearer $TOK"
```

Expected: 200 with `pageviews`/`visitors` fields (zeros are fine).

### Task 3: Cloudflare tunnel route (user step)

**Interfaces:**
- Consumes: container `umami` on `monitoring_default`.
- Produces: `https://umami.<HOMELAB_DOMAIN>` publicly serving Umami, NOT Access-gated.

- [ ] **Step 1: Ask Josh to add the published route (dashboard, ~2 min)**

The 2026-06-28 API tokens were deleted after that run, so this is a dashboard step unless Josh prefers to mint a new token. Instructions for Josh: Cloudflare Zero Trust → Networks → Connectors → tunnel `homelab` → Published application routes → Add: subdomain `umami`, domain `<HOMELAB_DOMAIN>`, service `HTTP`, URL `umami:3000`. Do NOT create a Cloudflare Access application for it (the collect endpoint must stay open; Umami's own login protects the UI).

- [ ] **Step 2: Verify public reachability**

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://umami.<HOMELAB_DOMAIN>/api/heartbeat`
Expected: `200`. Also verify the login page loads and the NEW password works (default was already changed in Task 2).

### Task 4: Site tracking wiring (first-party proxy)

**Files:**
- Modify: `vercel.json`
- Modify: `index.html` (head)

**Interfaces:**
- Consumes: `<WEBSITE_ID>` (Task 2), `https://umami.<HOMELAB_DOMAIN>` (Task 3).
- Produces: pageview tracking live on the deployed site at first-party paths `/u/script.js` and `/u/api/send`.

- [ ] **Step 1: Add rewrites to `vercel.json`**

Replace the `rewrites` array (SPA catch-all stays last; `/api/*` serverless functions are matched by Vercel before rewrites, so the catch-all is safe):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/u/script.js", "destination": "https://umami.<HOMELAB_DOMAIN>/script.js" },
    { "source": "/u/api/send", "destination": "https://umami.<HOMELAB_DOMAIN>/api/send" },
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Add the tracker tag to `index.html`**

In `<head>`, after the Twitter meta block, add:

```html
    <!-- Umami analytics (first-party proxied; cookieless) -->
    <script defer src="/u/script.js" data-website-id="<WEBSITE_ID>" data-host-url="/u"></script>
```

- [ ] **Step 3: Build and commit**

Run: `npm run build`
Expected: PASS.

```bash
git add vercel.json index.html
git commit -m "feat: first-party Umami tracking via rewrite proxy"
```

(Deploy verification happens in Task 9 after everything ships together.)

### Task 5: Session-signing library (TDD)

**Files:**
- Create: `api/_lib/session.ts`
- Test: `api/_lib/session.test.ts`
- Modify: `package.json` (add vitest + @vercel/node dev deps, `test` script)

**Interfaces:**
- Produces: `signSession(secret: string, now?: number): string` and `verifySession(token: string | undefined, secret: string, now?: number): boolean`. Token format `"<expiryMs>.<hmacHex>"`. Used by Tasks 6 and 7.

- [ ] **Step 1: Install dev deps and add the test script**

```bash
npm install -D vitest @vercel/node
```

In `package.json` scripts add: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing test**

Create `api/_lib/session.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signSession, verifySession } from './session'

const DAY = 86_400_000

describe('session token', () => {
  it('round-trips a valid token', () => {
    expect(verifySession(signSession('s3cret'), 's3cret')).toBe(true)
  })
  it('rejects a tampered token', () => {
    expect(verifySession(signSession('s3cret') + 'x', 's3cret')).toBe(false)
  })
  it('rejects the wrong secret', () => {
    expect(verifySession(signSession('a'), 'b')).toBe(false)
  })
  it('rejects an expired token', () => {
    const old = signSession('s', Date.now() - 8 * DAY)
    expect(verifySession(old, 's')).toBe(false)
  })
  it('rejects garbage and undefined', () => {
    expect(verifySession(undefined, 's')).toBe(false)
    expect(verifySession('nope', 's')).toBe(false)
    expect(verifySession('123.', 's')).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run api/_lib/session.test.ts`
Expected: FAIL (cannot resolve `./session`).

- [ ] **Step 4: Implement `api/_lib/session.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run api/_lib/session.test.ts`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add api/_lib/session.ts api/_lib/session.test.ts package.json package-lock.json
git commit -m "feat: HMAC session token library for admin auth"
```

### Task 6: Login endpoint

**Files:**
- Create: `api/admin/login.ts`

**Interfaces:**
- Consumes: `signSession` from `api/_lib/session.ts`; env vars `ADMIN_PASSWORD`, `ADMIN_SECRET`.
- Produces: `POST /api/admin/login` with JSON body `{"password": "..."}`. 204 + `Set-Cookie: admin_session=...` on success; 401 invalid; 429 throttled; 405 non-POST. The cookie name `admin_session` is consumed by Task 7.

- [ ] **Step 1: Implement `api/admin/login.ts`**

```ts
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
```

Note: the in-memory throttle is per warm function instance; that is an accepted limitation at this scale (spec B2).

- [ ] **Step 2: Build and commit**

Run: `npm run build`
Expected: PASS (the `api/` dir is compiled by Vercel, not tsc, but the build must stay green).

```bash
git add api/admin/login.ts
git commit -m "feat: admin login endpoint with signed session cookie"
```

### Task 7: Stats proxy endpoint

**Files:**
- Create: `api/admin/stats.ts`

**Interfaces:**
- Consumes: `verifySession` from `api/_lib/session.ts`; cookie `admin_session`; env vars `ADMIN_SECRET`, `UMAMI_API_URL` (e.g. the public Umami base URL, no trailing slash), `UMAMI_USER`, `UMAMI_PASS`, `UMAMI_WEBSITE_ID`.
- Produces: `GET /api/admin/stats?range=24h|7d|30d` (default `7d`) returning `{ range, stats, pages, referrers, active }` where `stats` is Umami's stats object, `pages`/`referrers` are arrays of `{ x: string, y: number }`, `active` is Umami's active-visitors payload. 401 unauthenticated, 502 if Umami is unreachable. Consumed by Task 8.

- [ ] **Step 1: Implement `api/admin/stats.ts`**

```ts
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
  } catch {
    return res.status(502).json({ error: 'analytics backend unreachable' })
  }
}
```

- [ ] **Step 2: Build and commit**

Run: `npm run build`
Expected: PASS.

```bash
git add api/admin/stats.ts
git commit -m "feat: session-gated Umami stats proxy"
```

### Task 8: `/admin` page

**Files:**
- Create: `src/pages/Admin.tsx`
- Modify: `src/App.tsx` (add route; do NOT add to the Layout nav)

**Interfaces:**
- Consumes: `POST /api/admin/login` (Task 6), `GET /api/admin/stats?range=` (Task 7).
- Produces: `/admin` route rendering login form or dashboard.

- [ ] **Step 1: Create `src/pages/Admin.tsx`**

```tsx
import { useCallback, useEffect, useState, type FormEvent } from 'react'

type Metric = { x: string | null; y: number }
type Stats = {
  range: string
  stats: { pageviews?: { value: number }; visitors?: { value: number } }
  pages: Metric[]
  referrers: Metric[]
  active: unknown
}

const RANGES = ['24h', '7d', '30d'] as const
type Range = (typeof RANGES)[number]

function activeCount(active: unknown): number {
  if (typeof active === 'object' && active !== null) {
    const v = (active as Record<string, unknown>).visitors ?? (active as Record<string, unknown>).x
    if (typeof v === 'number') return v
  }
  if (Array.isArray(active) && active.length > 0) {
    const first = active[0] as Record<string, unknown>
    if (typeof first?.x === 'number') return first.x
  }
  return 0
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-dim">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-fg">{value}</p>
    </div>
  )
}

function MetricList({ title, items }: { title: string; items: Metric[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-dim">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-sm text-muted">No data yet.</li>}
        {items.map((m) => (
          <li key={m.x ?? 'none'} className="flex justify-between gap-4 text-sm">
            <span className="truncate text-muted">{m.x ?? '(none)'}</span>
            <span className="shrink-0 font-mono text-fg">{m.y}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [range, setRange] = useState<Range>('7d')
  const [data, setData] = useState<Stats | null>(null)

  const load = useCallback(async (r: Range) => {
    const res = await fetch(`/api/admin/stats?range=${r}`)
    if (res.status === 401) {
      setAuthed(false)
      return
    }
    if (!res.ok) {
      setError('Analytics backend unreachable.')
      setAuthed(true)
      return
    }
    setError('')
    setData((await res.json()) as Stats)
    setAuthed(true)
  }, [])

  useEffect(() => {
    void load(range)
  }, [load, range])

  async function login(e: FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.status === 204) {
      setPassword('')
      void load(range)
    } else if (res.status === 429) {
      setError('Too many attempts. Try again later.')
    } else {
      setError('Invalid password.')
    }
  }

  if (authed === null) {
    return <section className="mx-auto max-w-3xl px-6 py-20 text-muted">Loading...</section>
  }

  if (!authed) {
    return (
      <section className="mx-auto max-w-sm px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Admin</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-fg">Sign in</h1>
        <form onSubmit={login} className="mt-8 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-fg outline-none focus:border-border-bright"
          />
          {error && <p className="text-sm text-purple">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-cyan to-purple px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Sign in
          </button>
        </form>
      </section>
    )
  }

  const pageviews = data?.stats?.pageviews?.value ?? 0
  const visitors = data?.stats?.visitors?.value ?? 0

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Admin</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg">Site analytics</h1>
      <div className="mt-6 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full border px-4 py-1.5 font-mono text-xs transition-colors ${
              r === range
                ? 'border-border-bright bg-card-hover text-fg'
                : 'border-border text-muted hover:text-fg'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      {error && <p className="mt-6 text-sm text-purple">{error}</p>}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="Visitors" value={visitors} />
        <Card label="Pageviews" value={pageviews} />
        <Card label="Live now" value={activeCount(data?.active)} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricList title="Top pages" items={data?.pages ?? []} />
        <MetricList title="Referrers" items={data?.referrers ?? []} />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Register the route in `src/App.tsx`**

Add the import and route (route only; the nav in `Layout.tsx` is untouched):

```tsx
import Admin from './pages/Admin'
```

and inside the `<Route element={<Layout />}>` block, before the catch-all:

```tsx
        <Route path="/admin" element={<Admin />} />
```

- [ ] **Step 3: Build, run tests, commit**

Run: `npm run build && npm test`
Expected: build PASS, 5 tests passed.

```bash
git add src/pages/Admin.tsx src/App.tsx
git commit -m "feat: /admin analytics panel"
```

### Task 9: Env vars, deploy, end-to-end verification

**Interfaces:**
- Consumes: everything above.
- Produces: the live feature.

- [ ] **Step 1: Ask Josh to set Vercel env vars (dashboard, ~3 min)**

Vercel project → Settings → Environment Variables (Production):
`ADMIN_PASSWORD` (his choice), `ADMIN_SECRET` (`openssl rand -hex 32`), `UMAMI_API_URL` (`https://umami.<HOMELAB_DOMAIN>`), `UMAMI_USER` (`admin`), `UMAMI_PASS` (from Task 2, secrets note), `UMAMI_WEBSITE_ID` (from Task 2). Record `ADMIN_PASSWORD`/`ADMIN_SECRET` in the vault secrets note too.

- [ ] **Step 2: Push (auth-switch workflow) and wait for deploy**

```bash
gh auth switch --user joshuadsutcliff
git push origin main
gh auth switch --user brass458
```

Expected: Vercel deploy completes (~1 min).

- [ ] **Step 3: Verify tracking end to end**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://www.joshuasutcliff.com/u/script.js   # expect 200
```

Visit the live site from a non-excluded browser, click through 2 or 3 pages, then confirm the pageviews appear in Umami (realtime view) with distinct URLs.

- [ ] **Step 4: Verify the admin panel**

Wrong password: expect the form to show "Invalid password." (401). Correct password: dashboard renders and numbers match Umami's dashboard for the same range. Confirm the cookie is `HttpOnly; Secure; SameSite=Strict` in devtools.

- [ ] **Step 5: Verify no leakage in the client bundle**

```bash
grep -ri "<HOMELAB_DOMAIN literal>" dist/ ; grep -ri "UMAMI_\|ADMIN_" dist/assets/*.js | grep -v "admin_session" 
```

Expected: no homelab hostname and no env var values in `dist/` (the `/u/*` paths and cookie name are fine and expected).

- [ ] **Step 6: Exclude Josh's own devices**

On each of his browsers, on joshuasutcliff.com run `localStorage.setItem('umami.disabled', '1')` in devtools.

### Task 10: Documentation

**Files:**
- Modify (vault): `Areas/Personal/HomeLab/homelab-monitoring.md` (new Umami section: compose project, tunnel route, open-by-necessity rationale, pinned images)
- Modify (vault): `System/References/joshuasutcliff-website.md` (analytics + admin panel section: architecture, env var names WITHOUT values, the first-party proxy trick, admin URL)
- Modify (vault, gitignored): `homelab-monitoring-secrets` note (Umami creds, ADMIN_* values, website id)

- [ ] **Step 1: Write the three vault updates listed above**
- [ ] **Step 2: Commit the vault via the normal Obsidian Git flow (auto) and confirm the site repo is clean (`git status`)**
