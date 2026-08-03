import { Link } from 'react-router-dom'
import { GithubIcon } from '../components/icons'
import { PROJECT_GROUPS } from '../content/projects'
import { CHANGELOG_ENTRIES, CHANGELOG_HEADING, CHANGELOG_INTRO } from '../content/changelog'
import { DIAGRAMS_ENTRIES, DIAGRAMS_HEADING, DIAGRAMS_INTRO } from '../content/diagrams'

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
              return (
                <div
                  key={card.title}
                  className={`glass flex flex-col rounded-2xl p-7${card.href ? ' group transition-all duration-300 hover:-translate-y-1' : ''}`}
                >
                  {card.href ? (
                    <a
                      href={card.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-1 flex-col"
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                  {card.secondaryHref && card.secondaryLabel && (
                    <Link
                      to={card.secondaryHref}
                      className="mt-3 inline-flex items-center gap-2 font-mono text-xs text-cyan hover:text-purple"
                    >
                      {card.secondaryLabel} →
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="mt-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-muted">{DIAGRAMS_HEADING}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{DIAGRAMS_INTRO}</p>
        <div className="mt-5 grid gap-5">
          {DIAGRAMS_ENTRIES.map((entry) => (
            <div key={entry.id} className="glass flex flex-col rounded-2xl p-7">
              <p className="font-display text-xl font-semibold text-fg">{entry.title}</p>
              <img
                src={entry.image}
                alt={entry.alt}
                loading="lazy"
                className="mt-4 w-full rounded-xl border border-border"
              />
              <div className="mt-4 space-y-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-dim">What it shows</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{entry.what}</p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-dim">Why it's built this way</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{entry.why}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-muted">{CHANGELOG_HEADING}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{CHANGELOG_INTRO}</p>
        <div className="mt-5 grid gap-5">
          {CHANGELOG_ENTRIES.map((entry) => (
            <div key={entry.title} className="glass flex flex-col rounded-2xl p-7">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-xl font-semibold text-fg">{entry.title}</p>
                <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] text-muted">
                  {entry.date}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-dim">What changed</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{entry.what}</p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-dim">Why</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{entry.why}</p>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-dim">The win</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{entry.improvement}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
