# Visitor Analytics + Admin Panel: Design

**Date:** 2026-07-03
**Status:** Approved (brainstorm 2026-07-03)
**Goal:** Track visitors and the pages they visit on joshuasutcliff.com, viewable two ways: Umami's own dashboard (deep dive) and a small branded `/admin` panel on the site itself (quick glance).

## Context and constraints

- The site is a Vite + React SPA on Vercel Hobby (free tier). No backend today; this design adds the repo's first serverless functions under `api/`.
- The repo is PUBLIC. No secrets, tokens, or private hostnames may appear in committed code or client-visible bundles. All secrets live in Vercel env vars; the analytics host must not be tied to the site in client-visible code.
- Budget: $0. Analytics is self-hosted on infrastructure the owner already runs (the home-lab Monitoring VM, Docker).
- Repo style rule: no em dashes anywhere (pre-commit hook enforces).

## Part A: Collection (Umami, self-hosted)

### A1. Deployment
- New compose project on the Monitoring VM: `~/umami/` with two pinned services: `umami` (ghcr.io/umami-software/umami, postgresql variant) and `umami-db` (postgres, pinned major). Postgres data in a local volume.
- Both services join `monitoring_default` as an **external network declared in the compose file** (recreate-safe pattern; matches seerr/netmap doctrine).
- Secrets (`DATABASE_URL` password, `APP_SECRET`) live in `~/umami/.env` on the VM, mode 0600. Never in the vault or this repo.

### A2. Public exposure
- New Cloudflare tunnel published route: `umami.<homelab public domain>` routed to the container **by name** (per tunnel doctrine), **open** rather than Access-gated. Rationale: every visitor's browser must POST pageviews to the collect endpoint; Umami's own login protects the dashboard UI. Same open-by-necessity class as the requests and ntfy hosts.
- DNS + ingress via the Cloudflare API, same method as the 2026-06-28 subdomain work.

### A3. Site wiring (first-party proxy, ad-blocker-resistant)
- `vercel.json` gains rewrites so the tracker is served and posts **first-party**:
  - `/u/script.js` rewrites to the Umami host's `/script.js`
  - `/u/api/send` rewrites to the Umami host's `/api/send`
- `index.html` gains one script tag: `<script defer src="/u/script.js" data-website-id="<umami website id>" data-host-url="/u"></script>`. The website id is not a secret (it appears in any Umami deployment's page source).
- The Umami hostname appears ONLY inside `vercel.json` rewrite destinations. Accepted trade-off: `vercel.json` is committed and public, so the hostname is discoverable by someone reading the repo, but it never ships in the client bundle or network calls made by browsers. If stricter separation is ever wanted, move the rewrites to Vercel dashboard config.
- SPA route changes are tracked automatically by Umami's script (History API).

### A4. Privacy
- Umami is cookieless and stores no PII; no consent banner is added.
- Owner's own visits excluded via Umami's standard `umami.disabled=1` localStorage flag, set once per device.

## Part B: `/admin` panel on the site

### B1. Route and UI
- New SPA route `/admin`, not linked from the nav. Uses existing design tokens/components.
- States: login form (password only) and dashboard.
- Dashboard content: visitors and pageviews for 24h / 7d / 30d, top pages, top referrers, current live-visitor count. Anything deeper: link out to the Umami dashboard.

### B2. Auth
- `POST api/admin/login` (Vercel serverless): compares the submitted password to `ADMIN_PASSWORD` env var (constant-time compare); on success sets a signed, httpOnly, Secure, SameSite=Strict session cookie (HMAC with `ADMIN_SECRET` env var, ~7 day expiry). Login attempts are rate-limited per IP (simple in-memory throttle per function instance; acceptable at this scale).
- No user table, no registration; single owner password.

### B3. Data path
- `GET api/admin/stats` (Vercel serverless): verifies the session cookie, then calls the Umami HTTP API (stats, metrics by URL, metrics by referrer, active visitors) using `UMAMI_API_*` env vars (API endpoint + API key or user credentials, per Umami's auth model), aggregates into one JSON payload for the panel.
- The browser never talks to Umami directly for stats; the API key never leaves the serverless layer.

### B4. Env vars (Vercel project settings, never committed)
- `ADMIN_PASSWORD`, `ADMIN_SECRET`, `UMAMI_API_URL`, `UMAMI_API_KEY` (or `UMAMI_USER`/`UMAMI_PASS` if key auth is unavailable in the deployed version), `UMAMI_WEBSITE_ID`.

## Error handling

- Tracking script failing to load (blocked/offline) must not affect the site: the tag is `defer` and independent.
- `api/admin/stats` returns 401 without a valid session; the panel redirects to login.
- Umami unreachable from Vercel: stats endpoint returns 502 with a friendly panel message ("analytics backend unreachable"); login still works.
- Vercel rewrite target down: visitor tracking silently drops (acceptable); site unaffected.

## Testing

1. `npm run build` passes (typecheck + vite).
2. After deploy: script loads from `/u/script.js` (200), a test pageview appears in Umami's realtime view, and navigating SPA routes records distinct URLs.
3. `/admin`: wrong password rejected (401, throttled on repeat); correct password renders stats matching Umami's dashboard numbers; cookie is httpOnly + Secure.
4. Confirm no secret and no homelab hostname appears in `dist/` client bundle output.

## Out of scope

- Custom event tracking (clicks, downloads), goals/funnels, email reports.
- Multi-user auth or roles.
- Historical import (tracking starts at deploy).

## Ops notes

- Umami joins the existing maintenance surface: pinned images upgraded deliberately (same policy as the rest of the stack); DB volume included in the VM's normal practices; document in the vault home-lab notes, including the new tunnel route.
- Push workflow unchanged: `gh auth switch --user joshuadsutcliff`, push, switch back. Vercel auto-deploys `main`.
