export function lookupCity(
  city: string,
  country: string,
  cities: Record<string, [number, number]>,
  centroids: Record<string, [number, number]>,
): { lat: number; lng: number; exact: boolean } | null {
  const key = `${(city || '').toLowerCase()}, ${country}`
  const hit = cities[key]
  if (hit) return { lat: hit[0], lng: hit[1], exact: true }
  const c = centroids[country]
  if (c) return { lat: c[0], lng: c[1], exact: false }
  return null
}
