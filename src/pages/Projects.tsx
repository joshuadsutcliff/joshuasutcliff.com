import { Link } from 'react-router-dom'
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
              const className = `glass relative flex flex-col rounded-2xl p-7${card.slug ? ' group transition-all duration-300 hover:-translate-y-1' : ''}`
              return (
                <div key={card.title} className={className}>
                  {card.slug && (
                    <Link
                      to={`/projects/${card.slug}`}
                      aria-label={card.title}
                      className="absolute inset-0 rounded-2xl"
                    />
                  )}
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${card.statusTone === 'green' ? 'bg-green-400' : 'bg-amber-400'}`}
                    />
                    {card.status}
                  </div>
                  <p className="mt-3 font-display text-lg font-semibold text-fg">{card.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{card.tldr}</p>
                  {card.note && <p className="mt-3 text-xs leading-relaxed text-dim">{card.note}</p>}
                  {(card.href || (card.secondaryHref && card.secondaryLabel)) && (
                    <div className="relative z-10 mt-4 flex items-center gap-4">
                      {card.href && (
                        <a
                          href={card.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="View on GitHub"
                          className="inline-flex items-center gap-2 font-mono text-xs text-cyan hover:text-purple"
                        >
                          <GithubIcon className="h-4 w-4" />
                        </a>
                      )}
                      {card.secondaryHref && card.secondaryLabel && (
                        <Link
                          to={card.secondaryHref}
                          className="inline-flex items-center gap-2 font-mono text-xs text-cyan hover:text-purple"
                        >
                          {card.secondaryLabel} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
