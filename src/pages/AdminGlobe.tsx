import { useEffect, useRef, useState } from 'react'

type GeoPoint = { city: string; country: string; lat: number; lng: number; visitors: number; exact: boolean }
type GeoData = { range: string; points: GeoPoint[]; unmatched: Array<{ city: string; country: string; visitors: number }> }

export default function AdminGlobe({ range }: { range: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<{ _destructor?: () => void } | null>(null)
  const [data, setData] = useState<GeoData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function run() {
      setError('')
      let res: Response
      try {
        res = await fetch(`/api/admin/geo?range=${range}`)
      } catch {
        if (!cancelled) setError('Analytics backend unreachable.')
        return
      }
      if (!res.ok) {
        if (!cancelled) setError(res.status === 401 ? 'Session expired: reload and sign in.' : 'Analytics backend unreachable.')
        return
      }
      const geo = (await res.json()) as GeoData
      if (cancelled) return
      setData(geo)
      try {
        const { default: Globe } = await import('globe.gl')
        if (cancelled || !mountRef.current) return
        globeRef.current?._destructor?.()
        mountRef.current.innerHTML = ''
        const g = new Globe(mountRef.current)
          .globeImageUrl('/earth-night.jpg')
          .backgroundColor('rgba(0,0,0,0)')
          .width(mountRef.current.clientWidth)
          .height(480)
          .pointsData(geo.points)
          .pointLat('lat')
          .pointLng('lng')
          .pointAltitude((d: object) => 0.02 + Math.log10(1 + (d as GeoPoint).visitors) * 0.08)
          .pointRadius((d: object) => 0.35 + Math.log10(1 + (d as GeoPoint).visitors) * 0.3)
          .pointColor((d: object) => ((d as GeoPoint).exact ? '#06b6d4' : '#8b5cf6'))
          .pointLabel((d: object) => {
            const p = d as GeoPoint
            return `${p.city}, ${p.country}: ${p.visitors} visitor${p.visitors === 1 ? '' : 's'}`
          })
        g.controls().autoRotate = true
        g.controls().autoRotateSpeed = 0.6
        globeRef.current = g as unknown as { _destructor?: () => void }
      } catch {
        if (!cancelled) setError('Globe failed to load.')
      }
    }
    void run()
    return () => {
      cancelled = true
      globeRef.current?._destructor?.()
      globeRef.current = null
    }
  }, [range])

  return (
    <div className="mt-6">
      {error && <p className="text-sm text-purple">{error}</p>}
      {data && data.points.length === 0 && !error && (
        <p className="text-sm text-muted">No visitors in this window.</p>
      )}
      <div ref={mountRef} className="overflow-hidden rounded-xl border border-border bg-card" />
      {data && data.unmatched.length > 0 && (
        <p className="mt-3 font-mono text-xs text-dim">
          Unmapped: {data.unmatched.map((u) => `${u.city} (${u.visitors})`).join(', ')}
        </p>
      )}
      <p className="mt-2 font-mono text-xs text-dim">cyan = city-exact, purple = country-level</p>
    </div>
  )
}
