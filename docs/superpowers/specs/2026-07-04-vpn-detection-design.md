# VPN Detection Flag: Design

**Date:** 2026-07-04
**Status:** Draft for review
**Goal:** Flag visits that arrive via VPN/datacenter connections (vs. residential ISPs), surfaced as counts in Umami and a stat on the /admin panel. $0, no third-party API, visitor IPs never leave our infrastructure.

## Accuracy contract (owner-accepted)

Detection is IP-reputation classification, not a protocol signal. Commercial VPNs (datacenter egress) are caught reliably; residential-proxy VPNs are missed; iCloud Private Relay and corporate cloud egress can read as VPN. The flag means "hosting/VPN-class network," and is presented as such.

## Part A: Data source (build-time)

- **MaxMind GeoLite2-ASN** database (free; requires a MaxMind account + license key, a one-time owner step).
- NOT committed to the public repo (license/redistribution caution + freshness). Instead `scripts/fetch-asn-db.mjs` downloads it at BUILD time using a `MAXMIND_LICENSE_KEY` env var (Vercel build env), writing `api/_lib/GeoLite2-ASN.mmdb`. The path is gitignored.
- `package.json` build becomes: fetch script (skips gracefully with a warning when the key is absent, e.g. local dev) then the existing `tsc -b && vite build`. Every deploy refreshes the DB.
- Reader: the `maxmind` npm package (pure JS, no native deps), loaded once at module scope in the function.

## Part B: Classification

- `api/_lib/vpn-classify.ts`: `classifyAsn(asn: number, org: string): boolean` using (1) an explicit ASN set of known VPN/hosting providers and (2) a keyword heuristic on the org string (hosting, cloud, datacenter, vpn, server, and known provider names: M247, Datacamp, OVH, Hetzner, DigitalOcean, Linode, Vultr, Leaseweb, Contabo, Choopa, Amazon, Google Cloud, Azure, Akamai, etc.). Pure function, unit-tested (vitest) with fixture cases both ways.
- Maintainable: both lists live as exported constants; misclassifications get corrected by editing them.

## Part C: Tracking proxy (the wiring change)

- The `vercel.json` rewrite for `/u/api/send` currently points at Umami directly. It changes to point at a new function `api/track.ts` (same first-party path; the tracker script tag is untouched; `/u/script.js` rewrite stays direct).
- `api/track.ts` on each pageview/event:
  1. Extracts the visitor IP (Vercel-set forwarded header, first hop).
  2. Looks up ASN/org in the bundled DB and classifies.
  3. **Forwards the original payload to Umami unchanged**, preserving the original `User-Agent` (Umami parses it; fake UAs get bot-dropped) and setting `x-vercel-forwarded-for` to the visitor IP so Umami's existing geo path keeps working. Returns Umami's response to the browser.
  4. If classified VPN and the payload is a pageview: fires ONE additional Umami custom event (`name: "vpn-visit"`, data `{ asn, org }`) with the same UA/IP headers so it lands in the SAME Umami session (city, device, etc. attach to it).
- **Fail-open invariant:** any classification/DB failure must not affect tracking; the forward to Umami always happens; the extra event is best-effort. If the DB file is absent (key not configured), the function degrades to a pure pass-through proxy.
- Latency: one extra serverless hop on the send path only; module-scope DB cache after cold start. Accepted at this traffic level.

## Part D: Surfacing

- **Umami dashboard:** vpn-visit appears under Events (counts, plus session drill-in), no work needed.
- **/admin Stats tab:** `api/admin/stats.ts` additionally queries Umami's event metrics for the range and returns `vpnVisits` (count of `vpn-visit` events); the panel adds a fourth stat card "VPN visits" beside Visitors/Pageviews/Live. (Per-city VPN badges: out of scope, future.)

## Env & owner steps

- Owner: create a free MaxMind account, generate a license key, add `MAXMIND_LICENSE_KEY` to Vercel (build-time env). No other new env vars.

## Error handling

- Fetch script: hard-fails the build ONLY if the key is present but the download is corrupt; absent key = warn + skip (function then passes through).
- track.ts: classification wrapped so failures log a breadcrumb (`console.error`) and never block the forward.

## Testing

- Vitest: `classifyAsn` cases (known VPN ASN, hosting keyword, residential ISP negative, empty org).
- Post-deploy: pageview through the proxy still lands in Umami with correct city (proves header forwarding); a probe from the seedbox's AirVPN egress produces a `vpn-visit` event; a residential visit does not; /admin shows the VPN count.
- Bundle guard unchanged (all server-side; index chunk frozen).

## Out of scope

- Blocking/challenging VPN visitors (observation only).
- Residential-proxy detection, paid anonymity databases.
- Per-city VPN badges in the panel (future increment).
