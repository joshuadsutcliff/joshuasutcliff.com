# Globe City Panel + Rotation Behavior: Design

**Date:** 2026-07-04
**Status:** Approved (design confirmed by owner)
**Goal:** A clickable city list beside the /admin globe; selecting a city flies the camera to it and shows that city's visitor detail (aggregate, per Umami's privacy model). Also fixes the missed spec behavior: rotation must pause on interaction.

## Context

Extends the shipped visitor globe (spec 2026-07-03-visitor-globe-design.md). The original spec's "pause rotation while dragging" was never implemented; users report the globe keeps spinning while inspecting a city. All constraints carry over: public repo, no secrets, no em dashes, bundle guard (globe code stays in the lazy chunk), ESM `.js` extensions in api/**, $0.

## Part A: Rotation behavior

- Auto-rotate pauses on any user interaction with the globe (OrbitControls `start` event) and resumes after 10 seconds idle (`end` event starts the timer), unless a city is selected.
- Selecting a city: rotation stops and the camera animates to the city (`pointOfView({lat, lng, altitude}, ~1s)`).
- Deselecting (click the city again or a close control): rotation resumes.

## Part B: City panel

- Layout: on `lg+` screens the globe takes ~2/3 width and a panel ~1/3 beside it; stacked on smaller screens. Both live inside the existing lazy AdminGlobe chunk.
- Panel content: ranked city list for the current range (shared range buttons): city name, country code, visitor count, and a cyan/purple marker matching the dot's exact/fallback status. Scrollable when long.
- Clicking a city selects it: globe flies there, that dot highlights (larger/brighter), the panel expands the city inline with its detail (Part C). Clicking again deselects.
- The existing "unmatched" list stays below the globe.

## Part C: Per-city detail endpoint

- `GET api/admin/geo-city?city=<name>&range=24h|7d|30d` (default 7d). Session-gated (same `admin_session` verification), same token-cache/error patterns as the sibling endpoints.
- Queries Umami v2 with its `city` filter: `stats` (visitors, pageviews) plus `metrics` for `url`, `browser`, `os`, `device`, `referrer` (limit 5 each), all scoped to the city + range.
- Response: `{ range, city, stats: { visitors, pageviews }, pages, browsers, os, devices, referrers }` where each list is `[{ x, y }]`.
- Privacy note (accepted by owner): this is aggregate per-city data; Umami stores no per-person identity. The value is trend visibility (which cities bring which devices/browsers/pages).
- Errors: 401 unauthenticated, 400 missing/empty city param, 500 unconfigured, 502 Umami unreachable (with the console.error breadcrumb).

## Error handling

- City-detail fetch failure shows an inline error in the panel; the globe and list stay functional.
- Selecting a city whose detail returns empty data renders zeroes/empty lists, not an error.

## Testing

- Vitest: none new required (no new pure logic beyond passthrough shaping); endpoint verified by the runtime-faithful tsc check + live E2E, per project convention.
- Bundle guard: index chunk unchanged; panel + detail code lives in the AdminGlobe lazy chunk.
- Post-deploy: geo-city 401 without session, 400 without city; owner check: click a city, camera flies, detail renders, rotation pauses on drag and resumes after idle.

## Out of scope

- Per-visitor/session drill-down (Umami has a Sessions view in its own dashboard for that).
- Arcs, animations between cities, public exposure.
