# Secret /admin Entry + Two-Tier Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hidden gestures (select "Sutcliff" + Enter; 5-tap the footer copyright) open /admin with a theme-matched flourish, and the admin session gains an admin/viewer role tier where a shareable viewer password sees aggregate stats only.

**Architecture:** The session token grows from `exp.sig` to `exp.role.sig` (HMAC over `exp.role`); the login endpoint compares against two env passwords and stamps the role; read endpoints allow both roles while geo endpoints and all future writes require admin. Frontend adds one document-level hook in Layout for both secret gestures plus a CSS-only flourish overlay.

**Tech Stack:** Vite + React 19 + react-router 7 + Tailwind v4 (theme tokens in `src/index.css`), Vercel serverless functions (`@vercel/node`), vitest for `api/_lib` unit tests.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-12-secret-admin-entry-two-tier-access-design.md`.
- Repo: `~/Github/joshuasutcliff.com`, branch `main`. All commands run from the repo root.
- **NEVER use an em dash (the long dash character) anywhere: code, comments, copy, commit messages.** A commit hook rejects them. Use colons, commas, or hyphens.
- All copy is PUBLIC-SAFE: no client or employer names, no hostnames, IPs, or private infrastructure details.
- Env vars (already set in Vercel): `ADMIN_PASSWORD`, `ADMIN_SECRET`, `VIEWER_PASSWORD`. If `VIEWER_PASSWORD` is unset, viewer login is unavailable but admin login must still work (no 500).
- Cookie stays `admin_session`; HttpOnly; Secure; SameSite=Strict; Path=/; 7-day TTL.
- Typecheck with `npx tsc -b` (do NOT run `npm run build`; it fetches a remote ASN database). Tests with `npm test` (vitest run). Lint with `npm run lint`.
- Do not push until the final task; commit locally per task.
- Pushing requires `gh auth switch --user joshuadsutcliff` first, and switch back to brass458 after.

---

### Task 1: Session roles in `api/_lib/session.ts`

**Files:**
- Modify: `api/_lib/session.ts`
- Test: `api/_lib/session.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module, node:crypto only).
- Produces (later tasks rely on these exact signatures):
  - `type SessionRole = 'admin' | 'viewer'`
  - `signSession(secret: string, role: SessionRole, now?: number): string`
  - `verifySession(token: string | undefined, secret: string, now?: number): SessionRole | null`

- [ ] **Step 1: Replace the test file with role-aware failing tests**

Overwrite `api/_lib/session.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { signSession, verifySession } from './session'

const DAY = 86_400_000

describe('session token', () => {
  it('round-trips an admin token', () => {
    expect(verifySession(signSession('s3cret', 'admin'), 's3cret')).toBe('admin')
  })
  it('round-trips a viewer token', () => {
    expect(verifySession(signSession('s3cret', 'viewer'), 's3cret')).toBe('viewer')
  })
  it('rejects a tampered token', () => {
    expect(verifySession(signSession('s3cret', 'admin') + 'x', 's3cret')).toBe(null)
  })
  it('rejects a viewer token edited to claim admin', () => {
    const t = signSession('s3cret', 'viewer')
    const forged = t.replace('.viewer.', '.admin.')
    expect(forged).not.toBe(t)
    expect(verifySession(forged, 's3cret')).toBe(null)
  })
  it('rejects an equal-length forged signature', () => {
    const t = signSession('s3cret', 'admin')
    const i = t.lastIndexOf('.') + 20
    const c = t[i] === '0' ? '1' : '0'
    const forged = t.slice(0, i) + c + t.slice(i + 1)
    expect(forged.length).toBe(t.length)
    expect(verifySession(forged, 's3cret')).toBe(null)
  })
  it('rejects the wrong secret', () => {
    expect(verifySession(signSession('a', 'admin'), 'b')).toBe(null)
  })
  it('rejects an expired token', () => {
    const old = signSession('s', 'admin', Date.now() - 8 * DAY)
    expect(verifySession(old, 's')).toBe(null)
  })
  it('rejects an unknown role even when correctly signed', () => {
    const exp = Date.now() + DAY
    const payload = `${exp}.root`
    const sig = createHmac('sha256', 's').update(payload).digest('hex')
    expect(verifySession(`${payload}.${sig}`, 's')).toBe(null)
  })
  it('rejects legacy two-part exp.sig tokens', () => {
    const exp = Date.now() + DAY
    const sig = createHmac('sha256', 's').update(String(exp)).digest('hex')
    expect(verifySession(`${exp}.${sig}`, 's')).toBe(null)
  })
  it('rejects garbage and undefined', () => {
    expect(verifySession(undefined, 's')).toBe(null)
    expect(verifySession('nope', 's')).toBe(null)
    expect(verifySession('123.', 's')).toBe(null)
    expect(verifySession('123.admin.', 's')).toBe(null)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL (type errors / wrong return values; `signSession` does not accept a role yet).

- [ ] **Step 3: Implement role-aware sign/verify**

Overwrite `api/_lib/session.ts` with:

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_TTL_MS = 7 * 86_400_000

export type SessionRole = 'admin' | 'viewer'

const ROLES: readonly string[] = ['admin', 'viewer']

export function signSession(secret: string, role: SessionRole, now: number = Date.now()): string {
  const exp = now + SESSION_TTL_MS
  const payload = `${exp}.${role}`
  const sig = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): SessionRole | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [expStr, role, sig] = parts
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < now || sig.length === 0) return null
  if (!ROLES.includes(role)) return null
  const expected = createHmac('sha256', secret).update(`${expStr}.${role}`).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return role as SessionRole
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all `session token` tests PASS. (Other test files, `geo-lookup.test.ts` and `vpn-classify.test.ts`, must also still pass.)

Note: `npx tsc -b` will FAIL at this point because `api/admin/login.ts` still calls `signSession(secret)` with one argument. That is expected and fixed in Task 2; do not typecheck here.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/session.ts api/_lib/session.test.ts
git commit -m "feat(api): role-aware session tokens (admin/viewer)"
```

---

### Task 2: Two-password login in `api/admin/login.ts`

**Files:**
- Modify: `api/admin/login.ts`

**Interfaces:**
- Consumes: `signSession(secret, role)` and `SessionRole` from Task 1.
- Produces: `POST /api/admin/login` accepting `{ password: string }`; 204 + `admin_session` cookie carrying the matched role; 401 otherwise; 429 on throttle (unchanged).

- [ ] **Step 1: Update the handler to compare against both passwords**

In `api/admin/login.ts`, change the import line:

```typescript
import { signSession, type SessionRole } from '../_lib/session.js'
```

Then replace the body of the handler from the `const expected = process.env.ADMIN_PASSWORD` line down to the `const token = signSession(secret)` line with:

```typescript
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
```

Everything above that block (method check, throttle, `safeEqual`) and below it (Set-Cookie, 204) stays exactly as it is.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: PASS (no output). If it reports errors in `api/admin/stats.ts`, `geo.ts`, or `geo-city.ts` about `verifySession` in a boolean position, note that `if (!verifySession(...))` remains type-valid (null is falsy); those files change in Task 3 regardless.

- [ ] **Step 3: Run tests and lint**

Run: `npm test && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add api/admin/login.ts
git commit -m "feat(api): viewer password issues read-only session"
```

---

### Task 3: Endpoint authorization tiers

**Files:**
- Modify: `api/admin/stats.ts`
- Modify: `api/admin/geo.ts`
- Modify: `api/admin/geo-city.ts`

**Interfaces:**
- Consumes: `verifySession(token, secret): SessionRole | null` from Task 1.
- Produces: `GET /api/admin/stats` responds to both roles and includes `role: 'admin' | 'viewer'` in its JSON. `GET /api/admin/geo` and `GET /api/admin/geo-city` return 401 with no session and 403 for viewers.

- [ ] **Step 1: stats.ts allows both roles and reports the role**

In `api/admin/stats.ts`, replace:

```typescript
  const secret = process.env.ADMIN_SECRET
  if (!secret || !verifySession(req.cookies?.admin_session, secret)) {
    return res.status(401).json({ error: 'unauthorized' })
  }
```

with:

```typescript
  const secret = process.env.ADMIN_SECRET
  const role = secret ? verifySession(req.cookies?.admin_session, secret) : null
  if (!role) {
    return res.status(401).json({ error: 'unauthorized' })
  }
```

and replace the success response line:

```typescript
    return res.status(200).json({ range, stats, pages, referrers, active, vpnVisits })
```

with:

```typescript
    return res.status(200).json({ range, role, stats, pages, referrers, active, vpnVisits })
```

- [ ] **Step 2: geo.ts and geo-city.ts require admin**

In BOTH `api/admin/geo.ts` (auth check near line 47) and `api/admin/geo-city.ts` (auth check near line 41), replace:

```typescript
  if (!secret || !verifySession(req.cookies?.admin_session, secret)) {
    return res.status(401).json({ error: 'unauthorized' })
  }
```

with:

```typescript
  const role = secret ? verifySession(req.cookies?.admin_session, secret) : null
  if (!role) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' })
  }
```

Note: both files declare `const secret = process.env.ADMIN_SECRET` just above the check; keep that line. If the surrounding line is `if (!secret || !verifySession(...))`, make sure the new version still 401s when `secret` is undefined (the ternary above does).

- [ ] **Step 3: Typecheck, tests, lint**

Run: `npx tsc -b && npm test && npm run lint`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add api/admin/stats.ts api/admin/geo.ts api/admin/geo-city.ts
git commit -m "feat(api): stats serves both tiers, geo endpoints admin-only"
```

---

### Task 4: Role-aware admin UI

**Files:**
- Modify: `src/pages/Admin.tsx`

**Interfaces:**
- Consumes: `role` field in the `/api/admin/stats` JSON (Task 3).
- Produces: viewers see stat cards, top pages, referrers, range switcher, and a VIEWER badge; the globe tab button is not rendered for viewers and the lazy `AdminGlobe` chunk never loads for them.

- [ ] **Step 1: Extend the Stats type**

In `src/pages/Admin.tsx`, add `role` to the `Stats` type:

```typescript
type Stats = {
  range: string
  role?: 'admin' | 'viewer'
  stats: { pageviews?: { value: number }; visitors?: { value: number } }
  pages: Metric[]
  referrers: Metric[]
  active: unknown
  vpnVisits?: number
}
```

- [ ] **Step 2: Gate the globe tab and add the badge**

Inside the authed return of `Admin()`, first add a derived flag just after `const visitors = ...`:

```typescript
  const isAdminRole = data?.role !== 'viewer'
```

(Default to admin when `role` is absent so a cached/deployed-skew response does not hide the UI from Josh; the server remains authoritative.)

Replace the header label line:

```tsx
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Admin</p>
```

(the one inside the authed return, NOT the sign-in form) with:

```tsx
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">
        Admin
        {data?.role === 'viewer' && (
          <span className="ml-3 rounded-full border border-border px-2 py-0.5 text-[10px] tracking-widest text-dim">
            Viewer
          </span>
        )}
      </p>
```

Replace the view-tab row:

```tsx
      <div className="mt-4 flex gap-2">
        {(['stats', 'globe'] as const).map((v) => (
```

with:

```tsx
      <div className="mt-4 flex gap-2">
        {(isAdminRole ? (['stats', 'globe'] as const) : (['stats'] as const)).map((v) => (
```

And gate the globe view itself, replacing:

```tsx
      {view === 'globe' && (
```

with:

```tsx
      {view === 'globe' && isAdminRole && (
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual check (dev server)**

Run: `npm run dev` and open `http://localhost:5173/admin`.
Without valid umami/env config locally the page may show "Analytics backend unreachable."; that is fine. The point of this check is only that the page renders and the stats tab layout is intact. Stop the dev server after.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin.tsx
git commit -m "feat(admin): viewer badge, globe hidden for read-only tier"
```

---

### Task 5: Secret entry hook, flourish, and gesture wiring

**Files:**
- Create: `src/hooks/useSecretAdmin.ts`
- Create: `src/components/AccessFlourish.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: react-router `useNavigate`/`useLocation`; the `[data-secret-admin]` attribute rendered by Footer.
- Produces: `useSecretAdmin(): boolean` (true while the flourish overlay should render); `<AccessFlourish />` presentational component.

- [ ] **Step 1: Create the hook**

Create `src/hooks/useSecretAdmin.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Secret /admin entry. Two gestures, both handled at document level:
// 1. Select the site owner's name anywhere, press Enter.
// 2. Tap/click the element marked [data-secret-admin] 5 times, each tap
//    within 3s of the previous.
// Security lives in the server-side password gate; this is a doorway, not a lock.

const NAMES = ['sutcliff', 'joshua sutcliff']
const TAPS_REQUIRED = 5
const TAP_WINDOW_MS = 3000
const FLOURISH_MS = 700

export default function useSecretAdmin(): boolean {
  const [flourish, setFlourish] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const taps = useRef({ count: 0, last: 0 })
  const busy = useRef(false)

  const trigger = useCallback(() => {
    if (busy.current || pathname === '/admin') return
    busy.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      busy.current = false
      navigate('/admin')
      return
    }
    setFlourish(true)
    window.setTimeout(() => {
      setFlourish(false)
      busy.current = false
      navigate('/admin')
    }, FLOURISH_MS)
  }, [navigate, pathname])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const sel = window.getSelection()?.toString().trim().toLowerCase() ?? ''
      if (NAMES.includes(sel)) trigger()
    }
    function onClick(e: MouseEvent) {
      const el = e.target instanceof Element ? e.target.closest('[data-secret-admin]') : null
      if (!el) return
      const now = Date.now()
      const t = taps.current
      t.count = now - t.last <= TAP_WINDOW_MS ? t.count + 1 : 1
      t.last = now
      if (t.count >= TAPS_REQUIRED) {
        t.count = 0
        trigger()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick)
    }
  }, [trigger])

  return flourish
}
```

- [ ] **Step 2: Create the flourish overlay**

Create `src/components/AccessFlourish.tsx`:

```tsx
export default function AccessFlourish() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center" aria-hidden="true">
      <div className="secret-pulse absolute h-24 w-24 rounded-full" />
      <p className="secret-caption font-mono text-xs uppercase tracking-[0.2em] text-cyan">
        Access channel open
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Add the flourish animation to `src/index.css`**

Append at the end of the file (uses existing theme tokens, so light/dark both work; the existing global `prefers-reduced-motion` block already zeroes these animations, and the hook skips the overlay entirely in that case):

```css
/* Secret /admin entry flourish */
@keyframes secret-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--cyan-rgb), 0.5);
    opacity: 1;
    transform: scale(0.4);
  }
  70% {
    box-shadow: 0 0 60px 30px rgba(var(--purple-rgb), 0.25);
  }
  100% {
    box-shadow: 0 0 120px 60px rgba(var(--purple-rgb), 0);
    opacity: 0;
    transform: scale(2.4);
  }
}
@keyframes secret-caption {
  0% {
    opacity: 0;
    letter-spacing: 0.6em;
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    letter-spacing: 0.2em;
  }
}
.secret-pulse {
  border: 1px solid var(--cyan);
  animation: secret-pulse 0.7s ease-out forwards;
}
.secret-caption {
  animation: secret-caption 0.7s ease-out forwards;
}
```

- [ ] **Step 4: Mount in Layout**

In `src/components/Layout.tsx`, add imports:

```typescript
import useSecretAdmin from '../hooks/useSecretAdmin'
import AccessFlourish from './AccessFlourish'
```

Change the component body:

```tsx
export default function Layout() {
  const flourish = useSecretAdmin()
  return (
    <div className="min-h-screen bg-bg text-fg">
      {flourish && <AccessFlourish />}
```

(the rest of the JSX is unchanged).

- [ ] **Step 5: Mark the footer copyright**

In `src/components/Footer.tsx`, replace:

```tsx
          <span>© {SITE.name}. Doctrine contributions © {SITE.attribution.caosAuthor}, CC BY 4.0.</span>
```

with:

```tsx
          <span>
            <span data-secret-admin>©</span> {SITE.name}. Doctrine contributions ©{' '}
            {SITE.attribution.caosAuthor}, CC BY 4.0.
          </span>
```

Only the FIRST copyright symbol gets the attribute. No className, no cursor style: it must look inert.

- [ ] **Step 6: Typecheck, lint, tests**

Run: `npx tsc -b && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 7: Manual gesture check (dev server)**

Run: `npm run dev`, open `http://localhost:5173/`:
1. Double-click the word "Sutcliff" in the hero heading to select it, press Enter. Expected: pulse + "ACCESS CHANNEL OPEN" caption for about 0.7s, then the /admin sign-in form.
2. Go back to /, select some other word, press Enter. Expected: nothing.
3. On /admin, type in the password field and press Enter. Expected: normal form submit, no navigation hijack.
4. Back on /, click the first © in the footer 5 times quickly. Expected: flourish + /admin.
5. Click it 4 times, wait 4 seconds, click again. Expected: nothing.
6. Toggle light theme and repeat gesture 4. Expected: flourish colors follow the light palette.
Stop the dev server after.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useSecretAdmin.ts src/components/AccessFlourish.tsx src/components/Layout.tsx src/components/Footer.tsx src/index.css
git commit -m "feat: secret /admin entry gestures with access flourish"
```

---

### Task 6: Full verification and deploy

**Files:**
- No new changes; verification and push only.

- [ ] **Step 1: Full local gate**

Run: `npx tsc -b && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 2: Push (account switch required)**

```bash
gh auth switch --user joshuadsutcliff
git push origin main
gh auth switch --user brass458
```

Vercel auto-deploys `main`.

- [ ] **Step 3: Production verification (needs Josh or a browser)**

On the live site:
1. Admin password login: full dashboard, globe tab present.
2. Viewer password login: VIEWER badge, no globe tab.
3. As viewer, `fetch('/api/admin/geo?range=7d')` from the console: expect 403.
4. Existing sessions from before the deploy get the sign-in form again (legacy token format rejected): log in once.
5. Both secret gestures on desktop; the 5-tap on a phone.

**Deploy note:** `VIEWER_PASSWORD` is already set in Vercel (confirmed 2026-07-12), so no env work remains.
