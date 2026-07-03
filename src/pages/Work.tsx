import { Link } from 'react-router-dom'
import { WORK } from '../content/work'

export default function Work() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">{WORK.kicker}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
        {WORK.headline}
      </h1>
      <div className="mt-8 space-y-5">
        {WORK.paragraphs.map((p) => (
          <p key={p.slice(0, 24)} className="leading-relaxed text-muted">
            {p}
          </p>
        ))}
      </div>
      <div className="mt-10">
        <Link
          to={WORK.cta.to}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-6 py-3 text-sm font-medium text-white shadow-[var(--shadow-neon)] transition-transform hover:scale-[1.03]"
        >
          {WORK.cta.label} →
        </Link>
      </div>
    </section>
  )
}
