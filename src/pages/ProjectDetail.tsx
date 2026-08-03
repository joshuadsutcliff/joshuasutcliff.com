import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { GithubIcon } from '../components/icons'
import Lightbox from '../components/Lightbox'
import { PROJECT_GROUPS, type ProjectCard } from '../content/projects'
import { PROJECT_DETAILS } from '../content/projects-detail'
import { CHANGELOG_ENTRIES, CHANGELOG_HEADING, CHANGELOG_INTRO } from '../content/changelog'
import { DIAGRAMS_ENTRIES, DIAGRAMS_HEADING, DIAGRAMS_INTRO } from '../content/diagrams'

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null)

  const card: ProjectCard | undefined = PROJECT_GROUPS.flatMap((group) => group.cards).find(
    (c) => c.slug === slug,
  )
  const detail = slug ? PROJECT_DETAILS[slug] : undefined

  useEffect(() => {
    if (!card) return
    const previous = document.title
    document.title = `${card.title} - Joshua Sutcliff`
    return () => {
      document.title = previous
    }
  }, [card])

  if (!card || !detail) {
    return <Navigate to="/projects" replace />
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Link to="/projects" className="font-mono text-xs text-dim hover:text-cyan">
        &larr; back to projects
      </Link>

      <div className="mt-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
        <span
          className={`hud-dot ${card.statusTone === 'green' ? 'hud-dot--green' : 'hud-dot--amber'}`}
        />
        {detail.group} &middot; {card.status}
      </div>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{card.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">{card.tldr}</p>

      {(card.href || (card.secondaryHref && card.secondaryLabel)) && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {card.href && (
            <a
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hud-panel inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-fg"
            >
              <GithubIcon className="h-4 w-4" />
              View on GitHub
            </a>
          )}
          {card.secondaryHref && card.secondaryLabel && (
            <Link
              to={card.secondaryHref}
              className="inline-flex items-center gap-2 font-mono text-xs text-cyan hover:text-purple"
            >
              {card.secondaryLabel} &rarr;
            </Link>
          )}
        </div>
      )}
      {card.note && <p className="mt-3 text-xs leading-relaxed text-dim">{card.note}</p>}

      <div className="hud-panel mt-10 rounded-3xl p-8 sm:p-12">
        {detail.overview.map((paragraph, i) => (
          <p key={i} className={`leading-relaxed text-muted ${i === 0 ? '' : 'mt-4'}`}>
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-10">
        <div className="flex items-center gap-3">
          <h2 className="hud-eyebrow">Stack</h2>
          <div className="hud-divider flex-1" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {detail.stack.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center gap-3">
          <h2 className="hud-eyebrow">Highlights</h2>
          <div className="hud-divider flex-1" />
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-muted">
          {detail.highlights.map((highlight, i) => (
            <li key={i}>{highlight}</li>
          ))}
        </ul>
      </div>

      {detail.extraSections?.map((section) => (
        <div key={section.heading} className="mt-10">
          <div className="flex items-center gap-3">
            <h2 className="hud-eyebrow">{section.heading}</h2>
            <div className="hud-divider flex-1" />
          </div>
          <div className="hud-panel mt-4 rounded-3xl p-8 sm:p-12">
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className={`leading-relaxed text-muted ${i === 0 ? '' : 'mt-4'}`}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      ))}

      {detail.showDiagrams && (
        <div className="mt-10">
          <div className="flex items-center gap-3">
            <h2 className="hud-eyebrow">{DIAGRAMS_HEADING}</h2>
            <div className="hud-divider flex-1" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{DIAGRAMS_INTRO}</p>
          <div className="mt-6 space-y-8">
            {DIAGRAMS_ENTRIES.map((entry, index) => {
              const isOddRow = index % 2 === 0
              return (
                <div key={entry.id} className="grid gap-5 md:grid-cols-[2fr_3fr]">
                  <button
                    type="button"
                    onClick={() => setLightboxImage({ src: entry.image, alt: entry.alt })}
                    className={`text-left ${isOddRow ? 'md:order-2' : ''}`}
                  >
                    <img
                      src={entry.image}
                      alt={entry.alt}
                      loading="lazy"
                      className="w-full rounded-xl border border-border"
                    />
                  </button>
                  <div>
                    <p className="font-display text-lg font-semibold text-fg">{entry.title}</p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-dim">What it shows</p>
                        <p className="mt-1 text-sm text-muted">{entry.what}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-dim">
                          Why it's built this way
                        </p>
                        <p className="mt-1 text-sm text-muted">{entry.why}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {detail.showChangelog && (
        <div className="mt-10">
          <details className="hud-panel rounded-2xl p-6 sm:p-8">
            <summary className="hud-eyebrow cursor-pointer">
              {CHANGELOG_HEADING}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{CHANGELOG_INTRO}</p>
            <div className="mt-5 grid gap-5">
              {CHANGELOG_ENTRIES.map((entry) => (
                <div key={entry.title} className="hud-panel flex flex-col rounded-2xl p-7">
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
          </details>
        </div>
      )}

      {detail.images && detail.images.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-3">
            <h2 className="hud-eyebrow">Screenshots</h2>
            <div className="hud-divider flex-1" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {detail.images.map((image) => (
              <button
                key={image.src}
                type="button"
                onClick={() => setLightboxImage(image)}
                className="hud-panel overflow-hidden rounded-2xl text-left"
              >
                <img src={image.src} alt={image.alt} loading="lazy" className="w-full" />
                {image.caption && <p className="p-3 text-xs text-dim">{image.caption}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {lightboxImage && (
        <Lightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </section>
  )
}
