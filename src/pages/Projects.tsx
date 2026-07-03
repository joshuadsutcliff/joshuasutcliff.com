import { GithubIcon } from '../components/icons'
import { PROJECT_GROUPS } from '../content/projects'

export default function Projects() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Projects</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
        Things I build and run.
      </h1>

      {PROJECT_GROUPS.map((group) => (
        <div key={group.heading} className="mt-12">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-muted">{group.heading}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {group.cards.map((card) => {
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-xl font-semibold text-fg">{card.title}</p>
                    {card.status && (
                      <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] text-muted">
                        {card.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{card.blurb}</p>
                  {card.note && <p className="mt-3 text-xs leading-relaxed text-dim">{card.note}</p>}
                  {card.href && (
                    <p className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-cyan">
                      <GithubIcon className="h-4 w-4" /> View on GitHub →
                    </p>
                  )}
                </>
              )
              return card.href ? (
                <a
                  key={card.title}
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass group flex flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                >
                  {inner}
                </a>
              ) : (
                <div key={card.title} className="glass flex flex-col rounded-2xl p-7">
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
