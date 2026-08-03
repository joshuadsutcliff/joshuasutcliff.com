import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { GithubIcon } from '../components/icons'
import Lightbox from '../components/Lightbox'
import { PROJECT_GROUPS, type ProjectCard } from '../content/projects'
import { PROJECT_DETAILS } from '../content/projects-detail'

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
          className={`h-1.5 w-1.5 rounded-full ${card.statusTone === 'green' ? 'bg-green-400' : 'bg-amber-400'}`}
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
              className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-fg"
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

      <div className="glass mt-10 rounded-3xl p-8 sm:p-12">
        {detail.overview.map((paragraph, i) => (
          <p key={i} className={`leading-relaxed text-muted ${i === 0 ? '' : 'mt-4'}`}>
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-muted">Stack</h2>
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
        <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-muted">Highlights</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-muted">
          {detail.highlights.map((highlight, i) => (
            <li key={i}>{highlight}</li>
          ))}
        </ul>
      </div>

      {detail.images && detail.images.length > 0 && (
        <div className="mt-10">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-muted">Screenshots</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {detail.images.map((image) => (
              <button
                key={image.src}
                type="button"
                onClick={() => setLightboxImage(image)}
                className="glass overflow-hidden rounded-2xl text-left"
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
