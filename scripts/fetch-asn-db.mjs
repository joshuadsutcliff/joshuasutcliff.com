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
