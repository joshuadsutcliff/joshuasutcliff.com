# Visitor Globe (/admin): Design

**Date:** 2026-07-03
**Status:** Draft for review
**Goal:** An interactive 3D globe on the /admin panel showing where site visitors are, city-level, for a selectable time window.

## Context

Builds on the visitor-analytics feature (spec `2026-07-03-visitor-analytics-admin-design.md`, shipped). Geo now resolves to city level end to end (verified: sessions record country/region/city). The globe is a second view on the existing password-protected /admin panel; it reuses the session cookie and the serverless proxy pattern. Constraints carried over: public repo, no secrets in code, no em dashes, $0 budget, no external services at runtime.

## Part A: Data endpoint

### A1. `GET api/admin/geo?range=24h|7d|30d` (default 7d)
- Auth: same `admin_session` cookie check as `api/admin/stats` (401 otherwise).
- Calls Umami v2 metrics API twice (city + country) for the range, using the existing env vars and token-cache pattern from `api/admin/stats.ts`.
- Maps each city name to coordinates through a bundled lookup (A2). Response shape:
  `{ range, points: [{ city, country, lat, lng, visitors }], unmatched: [{ city, country, visitors }] }`
  where `unmatched` are cities absent from the lookup after country-centroid fallback fails (expected to be rare; the panel shows them as a small list so no data is silently dropped).
- Errors: 502 with a generic body when Umami is unreachable (same pattern as stats), 500 when env vars absent.

### A2. City-coordinate lookup (the one real design problem)
- Umami returns city NAMES, not coordinates. No runtime geocoding API (violates $0/no-external-calls), so a static dataset ships in the repo.
- `api/_lib/city-coords.json`: a generated map of `"City, CC" -> [lat, lng]` for roughly the 10k most populous world cities, built once from the public-domain GeoNames cities15000 dataset by a small script committed at `scripts/build-city-coords.mjs` (documented, re-runnable; the JSON is committed so builds are hermetic).
- Lookup order: exact `"City, CC"` match, then country centroid (a second small map, ~250 entries, `api/_lib/country-centroids.json`), then `unmatched`.
- Size guard: the JSON must stay under ~600 KB raw; it is imported ONLY by the serverless function, never by the client bundle.

## Part B: Globe UI

### B1. Tab on /admin
- `/admin` gains a two-tab header: `Stats` (existing view, default) and `Globe`. Same session; no separate login. Tab state is client-side only.
- The globe view fetches `api/admin/geo?range=` on open and on range change, reusing the existing 24h/7d/30d selector pattern.

### B2. Rendering
- `globe.gl` (+ its three.js dependency) added as npm deps, **lazy-loaded via dynamic `import()`** inside the Globe tab component so the main site bundle is unchanged; the chunk loads only when the tab is opened by the authenticated owner.
- Night-style earth texture bundled locally in `public/` (no CDN fetch at runtime; CSP-clean and offline-friendly).
- Points layer: one dot per city, altitude/radius scaled by `visitors` (log scale so one heavy city does not flatten the rest), site-accent colors (cyan to purple ramp), tooltip `City, Country: N visitors`.
- Auto-rotate slowly; drag to orbit, scroll to zoom; pause rotation while dragging.
- Empty state: globe renders with a "no visitors in this window" note. `unmatched` cities listed under the globe if any.

### B3. Failure handling
- Network/HTTP failure on the geo fetch: same friendly error banner pattern as the stats view; the globe library only initializes after a successful fetch.
- Dynamic-import failure (offline admin): error banner, Stats tab unaffected.

## Testing

1. Unit (vitest): the city-lookup function (exact match, centroid fallback, unmatched) against a small fixture; range validation on the endpoint.
2. `npm run build` green; verify the main `index` bundle size is unchanged (globe code must live in a separate lazy chunk).
3. Post-deploy: /admin -> Globe renders the Las Cruces dot (known traffic); tooltip counts match the Stats city numbers for the same range; 401 without session.

## Out of scope

- Live "right now" pulsing view (possible later; polls the active endpoint).
- Public-facing globe page.
- Arcs/trajectories between cities, historical animation.

## Ops notes

- No new env vars, no homelab changes. Push workflow and em-dash rule unchanged.
- GeoNames attribution line added to the build script header (CC BY 4.0 requires attribution in the source, not the UI).
