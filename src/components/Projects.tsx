import { PROJECTS } from '../content/system'

export default function Projects() {
  return (
    <section id="projects" className="relative mx-auto max-w-5xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Open work</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Projects & code
        </h2>
        <p className="mt-4 text-muted">
          What&rsquo;s public flows from a private practice — operating machinery and blank-state
          templates, never the work data behind them.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-1">
        {PROJECTS.map((p) => (
          <a
            key={p.title}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="glass group flex flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-lg font-medium text-fg">{p.title}</h3>
              <span className="text-cyan transition-transform group-hover:translate-x-1">→</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{p.blurb}</p>
            <span className="mt-4 font-mono text-xs uppercase tracking-wider text-dim">
              {p.cta}
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
