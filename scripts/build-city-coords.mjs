// Builds api/_lib/city-coords.json and api/_lib/country-centroids.json.
// Source: GeoNames cities15000 dataset (https://download.geonames.org/export/dump/),
// licensed CC BY 4.0 (attribution: GeoNames, geonames.org). Run: node scripts/build-city-coords.mjs
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TOP_N = 10_000
const tmp = mkdtempSync(join(tmpdir(), 'geonames-'))
execSync(`curl -sL -o ${join(tmp, 'c.zip')} https://download.geonames.org/export/dump/cities15000.zip`)
execSync(`unzip -o -q ${join(tmp, 'c.zip')} -d ${tmp}`)

const rows = readFileSync(join(tmp, 'cities15000.txt'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const f = l.split('\t')
    return { name: f[1], lat: +f[4], lng: +f[5], cc: f[8], pop: +f[14] }
  })
  .sort((a, b) => b.pop - a.pop)
  .slice(0, TOP_N)

const cities = {}
for (const r of rows) {
  const key = `${r.name.toLowerCase()}, ${r.cc}`
  if (!(key in cities)) cities[key] = [+r.lat.toFixed(2), +r.lng.toFixed(2)]
}
writeFileSync('api/_lib/city-coords.json', JSON.stringify(cities))

// Country centroids: average the coords of each country's listed cities (adequate for fallback dots).
const byCc = {}
for (const r of rows) {
  ;(byCc[r.cc] ??= []).push([r.lat, r.lng])
}
const centroids = {}
for (const [cc, pts] of Object.entries(byCc)) {
  const lat = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const lng = pts.reduce((s, p) => s + p[1], 0) / pts.length
  centroids[cc] = [+lat.toFixed(2), +lng.toFixed(2)]
}
writeFileSync('api/_lib/country-centroids.json', JSON.stringify(centroids))
console.log(`cities: ${Object.keys(cities).length}, centroids: ${Object.keys(centroids).length}`)
