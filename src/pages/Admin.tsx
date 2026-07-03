import { useCallback, useEffect, useState, type FormEvent } from 'react'

type Metric = { x: string | null; y: number }
type Stats = {
  range: string
  stats: { pageviews?: { value: number }; visitors?: { value: number } }
  pages: Metric[]
  referrers: Metric[]
  active: unknown
}

const RANGES = ['24h', '7d', '30d'] as const
type Range = (typeof RANGES)[number]

function activeCount(active: unknown): number {
  if (typeof active === 'object' && active !== null) {
    const v = (active as Record<string, unknown>).visitors ?? (active as Record<string, unknown>).x
    if (typeof v === 'number') return v
  }
  if (Array.isArray(active) && active.length > 0) {
    const first = active[0] as Record<string, unknown>
    if (typeof first?.x === 'number') return first.x
  }
  return 0
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-dim">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-fg">{value}</p>
    </div>
  )
}

function MetricList({ title, items }: { title: string; items: Metric[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-dim">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.length === 0 && <li className="text-sm text-muted">No data yet.</li>}
        {items.map((m) => (
          <li key={m.x ?? 'none'} className="flex justify-between gap-4 text-sm">
            <span className="truncate text-muted">{m.x ?? '(none)'}</span>
            <span className="shrink-0 font-mono text-fg">{m.y}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [range, setRange] = useState<Range>('7d')
  const [data, setData] = useState<Stats | null>(null)

  const load = useCallback(async (r: Range) => {
    const res = await fetch(`/api/admin/stats?range=${r}`)
    if (res.status === 401) {
      setAuthed(false)
      return
    }
    if (!res.ok) {
      setError('Analytics backend unreachable.')
      setAuthed(true)
      return
    }
    setError('')
    setData((await res.json()) as Stats)
    setAuthed(true)
  }, [])

  useEffect(() => {
    void load(range)
  }, [load, range])

  async function login(e: FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.status === 204) {
      setPassword('')
      void load(range)
    } else if (res.status === 429) {
      setError('Too many attempts. Try again later.')
    } else {
      setError('Invalid password.')
    }
  }

  if (authed === null) {
    return <section className="mx-auto max-w-3xl px-6 py-20 text-muted">Loading...</section>
  }

  if (!authed) {
    return (
      <section className="mx-auto max-w-sm px-6 py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Admin</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-fg">Sign in</h1>
        <form onSubmit={login} className="mt-8 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-fg outline-none focus:border-border-bright"
          />
          {error && <p className="text-sm text-purple">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-cyan to-purple px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Sign in
          </button>
        </form>
      </section>
    )
  }

  const pageviews = data?.stats?.pageviews?.value ?? 0
  const visitors = data?.stats?.visitors?.value ?? 0

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Admin</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg">Site analytics</h1>
      <div className="mt-6 flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full border px-4 py-1.5 font-mono text-xs transition-colors ${
              r === range
                ? 'border-border-bright bg-card-hover text-fg'
                : 'border-border text-muted hover:text-fg'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      {error && <p className="mt-6 text-sm text-purple">{error}</p>}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="Visitors" value={visitors} />
        <Card label="Pageviews" value={pageviews} />
        <Card label="Live now" value={activeCount(data?.active)} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricList title="Top pages" items={data?.pages ?? []} />
        <MetricList title="Referrers" items={data?.referrers ?? []} />
      </div>
    </section>
  )
}
