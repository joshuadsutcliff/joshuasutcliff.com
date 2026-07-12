import { useEffect, useRef, useState } from 'react'
import CityPanel, { type GeoPoint } from './CityPanel'

type GeoData = { range: string; points: GeoPoint[]; unmatched: Array<{ city: string; country: string; visitors: number }> }

type GlobeInst = {
  _destructor?: () => void
  pointOfView: (pov: { lat: number; lng: number; altitude: number }, ms?: number) => void
  pointsData: (d: object[]) => void
  controls: () => {
    autoRotate: boolean
    autoRotateSpeed: number
    addEventListener: (ev: string, cb: () => void) => void
  }
}

export default function AdminGlobe({ range }: { range: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeInst | null>(null)
  const selectedRef = useRef<GeoPoint | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [data, setData] = useState<GeoData | null>(null)
  const [selected, setSelected] = useState<GeoPoint | null>(null)
  const [error, setError] = useState('')

  function pointStyle(g: GlobeInst, points: GeoPoint[]) {
    g.pointsData(points.map((p) => ({ ...p })))
  }

  function handleSelect(p: GeoPoint | null) {
    setSelected(p)
    selectedRef.current = p
    const g = globeRef.current
    if (!g) return
    if (p) {
      g.controls().autoRotate = false
      g.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.2 }, 1000)
    } else {
      g.controls().autoRotate = true
    }
    if (data) pointStyle(g, data.points)
  }

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
      setSelected(null)
      selectedRef.current = null
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
          .pointLat('lat')
          .pointLng('lng')
          .pointAltitude((d: object) => {
            const p = d as GeoPoint
            const sel = selectedRef.current
            const bump = sel && sel.city === p.city && sel.country === p.country ? 0.06 : 0
            return 0.02 + Math.log10(1 + p.visitors) * 0.08 + bump
          })
          .pointRadius((d: object) => {
            const p = d as GeoPoint
            const sel = selectedRef.current
            const bump = sel && sel.city === p.city && sel.country === p.country ? 0.25 : 0
            return 0.35 + Math.log10(1 + p.visitors) * 0.3 + bump
          })
          .pointColor((d: object) => {
            const p = d as GeoPoint
            const sel = selectedRef.current
            if (sel && sel.city === p.city && sel.country === p.country) return '#ffffff'
            return p.exact ? '#06b6d4' : '#8b5cf6'
          })
          .pointLabel((d: object) => {
            const p = d as GeoPoint
            return `${p.city}, ${p.country}: ${p.visitors} visitor${p.visitors === 1 ? '' : 's'}`
          }) as unknown as GlobeInst
        g.pointsData(geo.points.map((p) => ({ ...p })))
        const controls = g.controls()
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.6
        controls.addEventListener('start', () => {
          controls.autoRotate = false
          if (idleTimer.current) clearTimeout(idleTimer.current)
        })
        controls.addEventListener('end', () => {
          if (idleTimer.current) clearTimeout(idleTimer.current)
          idleTimer.current = setTimeout(() => {
            if (!selectedRef.current) controls.autoRotate = true
          }, 10_000)
        })
        globeRef.current = g
      } catch {
        if (!cancelled) setError('Globe failed to load.')
      }
    }
    void run()
    return () => {
      cancelled = true
      if (idleTimer.current) clearTimeout(idleTimer.current)
      globeRef.current?._destructor?.()
      globeRef.current = null
    }
  }, [range])

  return (
    <div className="mt-6">
      {error && <p className="text-sm text-purple">{error}</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div ref={mountRef} className="overflow-hidden rounded-xl border border-border bg-card" />
        </div>
        <CityPanel
          key={selected ? `${selected.city}|${selected.country}|${range}` : 'none'}
          points={data?.points ?? []}
          range={range}
          selected={selected}
          onSelect={handleSelect}
        />
      </div>
      {data && data.unmatched.length > 0 && (
        <p className="mt-3 font-mono text-xs text-dim">
          Unmapped: {data.unmatched.map((u) => `${u.city} (${u.visitors})`).join(', ')}
        </p>
      )}
      <p className="mt-2 font-mono text-xs text-dim">cyan = city-exact, purple = country-level, white = selected</p>
    </div>
  )
}
