import { useEffect, useState } from 'react'

export type GeoPoint = { city: string; country: string; lat: number; lng: number; visitors: number; exact: boolean }
type Metric = { x: string | null; y: number }
type CityDetail = {
  range: string
  city: string
  stats: { visitors: number; pageviews: number }
  pages: Metric[]
  browsers: Metric[]
  os: Metric[]
  devices: Metric[]
  referrers: Metric[]
}

function DetailList({ title, items }: { title: string; items: Metric[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((m) => (
          <li key={m.x ?? '(none)'} className="flex justify-between gap-3 text-xs">
            <span className="truncate text-muted">{m.x ?? '(none)'}</span>
            <span className="shrink-0 font-mono text-fg">{m.y}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CityPanel({
  points,
  range,
  selected,
  onSelect,
}: {
  points: GeoPoint[]
  range: string
  selected: GeoPoint | null
  onSelect: (p: GeoPoint | null) => void
}) {
  const [detail, setDetail] = useState<CityDetail | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!!selected)

  useEffect(() => {
    let cancelled = false
    if (!selected) return
    ;(async () => {
      let res: Response
      try {
        res = await fetch(`/api/admin/geo-city?city=${encodeURIComponent(selected.city)}&range=${range}`)
      } catch {
        if (!cancelled) {
          setError('Detail unavailable.')
          setLoading(false)
        }
        return
      }
      if (!res.ok) {
        if (!cancelled) {
          setError('Detail unavailable.')
          setLoading(false)
        }
        return
      }
      const d = (await res.json()) as CityDetail
      if (!cancelled) {
        setDetail(d)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selected, range])

  const sorted = [...points].sort((a, b) => b.visitors - a.visitors)

  return (
    <div className="max-h-[480px] overflow-y-auto rounded-xl border border-border bg-card p-4">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-dim">Cities</p>
      {sorted.length === 0 && <p className="mt-2 text-sm text-muted">No visitors in this window.</p>}
      <ul className="mt-2 space-y-1">
        {sorted.map((p) => {
          const isSel = selected?.city === p.city && selected?.country === p.country
          return (
            <li key={`${p.city}|${p.country}`}>
              <button
                onClick={() => onSelect(isSel ? null : p)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  isSel ? 'border-border-bright bg-card-hover text-fg' : 'border-transparent text-muted hover:bg-card-hover hover:text-fg'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${p.exact ? 'bg-cyan' : 'bg-purple'}`} />
                  <span className="truncate">
                    {p.city}
                    <span className="ml-1 font-mono text-xs text-dim">{p.country}</span>
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-fg">{p.visitors}</span>
              </button>
              {isSel && (
                <div className="mb-2 ml-4 mt-1 rounded-lg border border-border bg-bg2 p-3">
                  {loading && <p className="text-xs text-muted">Loading...</p>}
                  {error && <p className="text-xs text-purple">{error}</p>}
                  {detail && (
                    <>
                      <p className="font-mono text-xs text-fg">
                        {detail.stats.visitors} visitor{detail.stats.visitors === 1 ? '' : 's'}, {detail.stats.pageviews} view
                        {detail.stats.pageviews === 1 ? '' : 's'}
                      </p>
                      <DetailList title="Pages" items={detail.pages} />
                      <DetailList title="Browsers" items={detail.browsers} />
                      <DetailList title="OS" items={detail.os} />
                      <DetailList title="Devices" items={detail.devices} />
                      <DetailList title="Referrers" items={detail.referrers} />
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
