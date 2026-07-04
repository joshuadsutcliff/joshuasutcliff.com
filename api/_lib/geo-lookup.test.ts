import { describe, it, expect } from 'vitest'
import { lookupCity } from './geo-lookup'

const cities: Record<string, [number, number]> = {
  'las cruces, US': [32.31, -106.78],
  'tokyo, JP': [35.69, 139.69],
}
const centroids: Record<string, [number, number]> = { US: [39.5, -98.35], JP: [36.2, 138.25] }

describe('lookupCity', () => {
  it('exact city match (case-insensitive)', () => {
    expect(lookupCity('Las Cruces', 'US', cities, centroids)).toEqual({ lat: 32.31, lng: -106.78, exact: true })
  })
  it('falls back to country centroid', () => {
    expect(lookupCity('Alamogordo', 'US', cities, centroids)).toEqual({ lat: 39.5, lng: -98.35, exact: false })
  })
  it('returns null when city and country are both unknown', () => {
    expect(lookupCity('Nowhere', 'XX', cities, centroids)).toBeNull()
  })
  it('handles empty/undefined-ish city input via centroid', () => {
    expect(lookupCity('', 'JP', cities, centroids)).toEqual({ lat: 36.2, lng: 138.25, exact: false })
  })
})
