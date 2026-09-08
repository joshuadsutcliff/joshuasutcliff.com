import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { GithubIcon } from '../components/icons'
import Lightbox from '../components/Lightbox'
import Schematic from '../components/Schematic'
import { PROJECT_GROUPS, type ProjectCard } from '../content/projects'
import { PROJECT_DETAILS } from '../content/projects-detail'
import { CHANGELOG_ENTRIES, CHANGELOG_HEADING, CHANGELOG_INTRO } from '../content/changelog'
import { DIAGRAMS_ENTRIES, DIAGRAMS_HEADING, DIAGRAMS_INTRO } from '../content/diagrams'
import { SCHEMATICS } from '../content/schematics'
import { CliPanel, CliSectionHeader, CliCard, CliButton, CliChip, CliStatusDot } from '../components/cli'

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
    <CliPanel>
      <CliButton to="/projects" size="sm">
        &larr; back to projects
      </CliButton>

      <div className="mt-6">
        <CliStatusDot
          status={card.statusTone === 'green' ? 'ok' : 'warn'}
          label={`${detail.group} · ${card.status}`}
        />
      </div>
      <h1 className="font-cli text-cli-emphasis mt-3 text-2xl tracking-tight sm:text-3xl">
        {card.title}
      </h1>
      <p className="cli-prose text-cli-text mt-4 text-lg">{card.tldr}</p>

      {(card.href || (card.secondaryHref && card.secondaryLabel)) && (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {card.href && (
            <CliButton href={card.href} target="_blank" variant="solid">
              <GithubIcon className="h-4 w-4" />
              View on GitHub
            </CliButton>
          )}
          {card.secondaryHref && card.secondaryLabel && (
            <CliButton to={card.secondaryHref}>{card.secondaryLabel} &rarr;</CliButton>
          )}
        </div>
      )}
      {card.note && <p className="cli-prose text-cli-dim mt-3 text-xs">{card.note}</p>}

      <CliCard padding="lg" className="mt-10">
        {detail.overview.map((paragraph, i) => (
          <p key={i} className={`cli-prose text-cli-text ${i === 0 ? '' : 'mt-4'}`}>
            {paragraph}
          </p>
        ))}
      </CliCard>

      <div className="mt-10">
        {/* Stack and Highlights are the two sections every detail page
            has, so prefixing exactly those two gives a consistent rhythm.
            The variable sections below (extras, diagrams, changelog,
            screenshots) stay unprefixed on purpose: a command on every
            heading reads as noise rather than as terminal chrome. */}
        <CliSectionHeader as="h2" divider command="cat stack">
          Stack
        </CliSectionHeader>
        <div className="mt-4 flex flex-wrap gap-2">
          {detail.stack.map((item) => (
            <CliChip key={item}>{item}</CliChip>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <CliSectionHeader as="h2" divider command="cat highlights">
          Highlights
        </CliSectionHeader>
        <ul className="cli-prose text-cli-text mt-4 list-disc space-y-2 pl-5">
          {detail.highlights.map((highlight, i) => (
            <li key={i}>{highlight}</li>
          ))}
        </ul>
      </div>

      {detail.extraSections?.map((section) => (
        <div key={section.heading} className="mt-10">
          <CliSectionHeader as="h2" divider>
            {section.heading}
          </CliSectionHeader>
          <CliCard padding="lg" className="mt-4">
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className={`cli-prose text-cli-text ${i === 0 ? '' : 'mt-4'}`}>
                {paragraph}
              </p>
            ))}
          </CliCard>
          {section.schematicId && SCHEMATICS[section.schematicId] && (
            <div className="mt-6">
              <Schematic spec={SCHEMATICS[section.schematicId]!} />
            </div>
          )}
        </div>
      ))}

      {detail.showDiagrams && (
        <div className="mt-10">
          <CliSectionHeader as="h2" divider>
            {DIAGRAMS_HEADING}
          </CliSectionHeader>
          <p className="cli-prose text-cli-text mt-3 text-sm">{DIAGRAMS_INTRO}</p>
          <div className="mt-6 space-y-8">
            {DIAGRAMS_ENTRIES.map((entry, index) => {
              const isOddRow = index % 2 === 0
              const schematic = SCHEMATICS[entry.id]
              return (
                <div key={entry.id} className="grid gap-5 md:grid-cols-[2fr_3fr]">
                  <div className={isOddRow ? 'md:order-2' : ''}>
                    {schematic ? (
                      <Schematic spec={schematic} />
                    ) : (
                      /* Deliberate safety net, not currently reachable: every
                         DIAGRAMS_ENTRIES id has a matching SCHEMATICS spec
                         today, but this keeps a raw-PNG fallback in place for
                         any future entry that doesn't. */
                      entry.image ? (
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ src: entry.image!, alt: entry.alt })}
                          className="block w-full text-left"
                        >
                          <img
                            src={entry.image}
                            alt={entry.alt}
                            loading="lazy"
                            className="border-cli-dim/30 w-full rounded-xl border"
                          />
                        </button>
                      ) : null
                    )}
                    {entry.image && (
                      <button
                        type="button"
                        onClick={() => setLightboxImage({ src: entry.image!, alt: entry.alt })}
                        aria-label={'View original diagram: ' + entry.title}
                        className="font-cli text-cli-dim hover:text-cli-cyan mt-2 text-[11px]"
                      >
                        view original
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="font-cli text-cli-emphasis text-lg font-semibold">{entry.title}</p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="font-cli text-cli-dim text-[11px] uppercase tracking-[0.15em]">
                          What it shows
                        </p>
                        <p className="cli-prose text-cli-text mt-1 text-sm">{entry.what}</p>
                      </div>
                      <div>
                        <p className="font-cli text-cli-dim text-[11px] uppercase tracking-[0.15em]">
                          Why it's built this way
                        </p>
                        <p className="cli-prose text-cli-text mt-1 text-sm">{entry.why}</p>
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
          {/* The disclosure needs the border/rounded/padding treatment of a
              CliCard but <details> is not a div, so the box is built
              directly with the same border-cli-dim/30 bg-cli-bg tokens
              CliCard uses, keeping the two visually identical. */}
          <details className="group border-cli-dim/30 bg-cli-bg rounded-2xl border p-6 sm:p-8">
            <summary className="font-cli text-cli-sakura flex cursor-pointer items-center gap-1 tracking-wide">
              <span
                aria-hidden
                className="motion-reduce:transition-none inline-block transition-transform group-open:rotate-90"
              >
                &rsaquo;
              </span>
              {CHANGELOG_HEADING}
            </summary>
            <p className="cli-prose text-cli-text mt-3 text-sm">{CHANGELOG_INTRO}</p>
            <div className="mt-5 grid gap-5">
              {CHANGELOG_ENTRIES.map((entry) => (
                <CliCard key={entry.title} padding="lg" className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-cli text-cli-emphasis text-xl font-semibold">{entry.title}</p>
                    <CliChip className="shrink-0">{entry.date}</CliChip>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="font-cli text-cli-dim text-[11px] uppercase tracking-[0.15em]">
                        What changed
                      </p>
                      <p className="cli-prose text-cli-text mt-1 text-sm">{entry.what}</p>
                    </div>
                    <div>
                      <p className="font-cli text-cli-dim text-[11px] uppercase tracking-[0.15em]">Why</p>
                      <p className="cli-prose text-cli-text mt-1 text-sm">{entry.why}</p>
                    </div>
                    <div>
                      <p className="font-cli text-cli-dim text-[11px] uppercase tracking-[0.15em]">The win</p>
                      <p className="cli-prose text-cli-text mt-1 text-sm">{entry.improvement}</p>
                    </div>
                  </div>
                </CliCard>
              ))}
            </div>
          </details>
        </div>
      )}

      {detail.images && detail.images.length > 0 && (
        <div className="mt-10">
          <CliSectionHeader as="h2" divider>
            Screenshots
          </CliSectionHeader>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {detail.images.map((image) => (
              <button
                key={image.src}
                type="button"
                onClick={() => setLightboxImage(image)}
                className="border-cli-dim/30 bg-cli-bg overflow-hidden rounded-2xl border text-left"
              >
                <img src={image.src} alt={image.alt} loading="lazy" className="w-full" />
                {image.caption && <p className="text-cli-dim font-cli p-3 text-xs">{image.caption}</p>}
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
    </CliPanel>
  )
}
