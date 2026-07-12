# Secret /admin Entry + Two-Tier Access: Design

Date: 2026-07-12
Status: Approved pending user spec review

## Goal

Two related features for joshuasutcliff.com:

1. A hidden, fun way to reach the existing `/admin` dashboard (the URL stays directly reachable; the password gate remains the real security).
2. Two access tiers: a shareable read-only "viewer" password (aggregate umami stats only) and the existing owner password with full access.

## Feature 1: Secret entry

### Triggers

- **Desktop, name selection:** select the text "Sutcliff" anywhere on the site (also accept "Joshua Sutcliff"), then press Enter. Comparison is case-insensitive and whitespace-trimmed. The keydown handler is skipped when the event target is an input, textarea, or contenteditable element, so the admin password field and any future forms are unaffected.
- **Universal, copyright 5-tap:** the `©` character in `Footer.tsx` is wrapped in an unstyled `<span>` with a click counter. 5 clicks/taps, each within 3 seconds of the previous, triggers entry. No cursor or hover styling: visually inert.

### Implementation shape

- New hook `src/hooks/useSecretAdmin.ts` (single mount in `Layout.tsx`), exposing a `trigger()` used by both gestures.
- Both gestures work site-wide because Layout wraps every route.
- If already on `/admin`, triggers no-op.
- Listeners cleaned up on unmount. No console breadcrumbs.

### Success flourish

On trigger, before navigation:

- Full-screen fixed overlay, pointer-events none: a radial pulse ring animating from `--accent-cyan` to `--accent-purple`, plus a centered `font-mono uppercase tracking-[0.2em]` caption (e.g. "ACCESS CHANNEL OPEN") for roughly 700ms, then SPA-navigate to `/admin` via react-router (no reload).
- Pure CSS animation on existing theme tokens, so light/dark themes are inherited automatically.
- `prefers-reduced-motion: reduce` skips the flourish and navigates immediately.

## Feature 2: Two-tier access

### Session token

Current format is `exp.sig`. New format: `exp.role.sig` with `sig = HMAC-SHA256(secret, "exp.role")`.

- `signSession(secret, role, now?)` where `role` is `'admin' | 'viewer'`.
- `verifySession(token, secret, now?)` returns `'admin' | 'viewer' | null`.
- Legacy `exp.sig` tokens fail verification by construction. No migration: all parties log in once after deploy.
- Cookie name, HttpOnly/Secure/SameSite=Strict attributes, and 7-day TTL unchanged.

### Login (`api/admin/login.ts`)

- New env var `VIEWER_PASSWORD` alongside `ADMIN_PASSWORD` and `ADMIN_SECRET`.
- The submitted password is timing-safe-compared against both. Admin match issues an `admin` token; viewer match issues a `viewer` token; neither is a 401. Both comparisons always run (no early exit) to avoid a timing side channel on which password matched.
- Existing per-IP rate limiting unchanged.
- The login UI stays a single password field: the password itself selects the tier.
- If `VIEWER_PASSWORD` is unset, viewer login is simply unavailable; admin login still works (do not 500).

### Endpoint authorization

- New helper in `api/_lib/session.ts`: `requireRole(req, minRole)` (or equivalent) so future endpoints require `admin` by default.
- `api/admin/stats.ts`: allows both roles; adds `role` to its JSON response.
- `api/admin/geo.ts` and `api/admin/geo-city.ts`: require `admin`; viewers receive 403.
- Any future write endpoint requires `admin`.

### Frontend (`src/pages/Admin.tsx`)

- Reads `role` from the stats response.
- Viewer sees: stat cards (pageviews, visitors, active), top pages, referrers, range switcher. Viewer does not see: the Globe tab (button not rendered; the lazy `AdminGlobe` chunk never loads), or any future write controls.
- A small `font-mono` "VIEWER" badge in the header indicates the mode.
- Server-side enforcement is authoritative; UI hiding is courtesy. A viewer hand-crafting geo requests gets 403s.

## Privacy line

Viewers get aggregate analytics only. City-level, IP-derived visitor locations (globe, city panel) stay owner-only.

## Testing

- `api/_lib/session.test.ts`: role round-trip for both roles; tampered token (viewer edited to claim admin) fails; legacy `exp.sig` format fails; expired token fails.
- Manual desktop: select name then Enter navigates with flourish; random selection plus Enter does nothing; Enter inside the password field submits the form normally.
- Manual mobile: 5-tap on `©` navigates; 4 taps plus a pause does nothing.
- Manual tiers: viewer password shows badge and no globe; direct `/api/admin/geo` returns 403 as viewer, 200 as admin.

## Deploy note

Set `VIEWER_PASSWORD` in Vercel project env vars before or with this deploy. Existing sessions become invalid at rollout (expected, one-time re-login).

## Out of scope

- Removing `/admin` from the router (stays URL-reachable).
- Country-level globe for viewers (decided against; may revisit).
- Any actual write features (this design only reserves the authorization posture for them).
