import { GithubIcon, MailIcon } from '../components/icons'
import { SITE } from '../content/site'
import { HOME } from '../content/home'
import useReveal from '../hooks/useReveal'
import { CliPanel, CliCard, CliButton } from '../components/cli'

export default function Home() {
  // Single useReveal call, ref attached to the grid CONTAINER (not inside the
  // .map()), so every teaser is found by the container query and armed. This
  // is not the one-ref-per-map bug fixed on the projects page.
  const teaserRef = useReveal<HTMLDivElement>()

  return (
    <CliPanel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-cli text-cli-cyan text-[11px] tracking-[0.24em] uppercase">
          {SITE.location}
        </p>
      </div>

      <h1 className="font-cli text-cli-emphasis mt-3 text-2xl tracking-tight sm:text-3xl">
        {SITE.name}
      </h1>
      <p className="font-cli text-cli-text mt-3 text-base sm:text-lg">{SITE.oneLiner}</p>

      {/* Long-form prose is Geologica (.cli-prose), not monospace. */}
      <p className="cli-prose mt-5 max-w-2xl">{HOME.intro}</p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <CliButton variant="solid" href={`mailto:${SITE.email}`}>
          <MailIcon className="h-4 w-4" /> Get in touch
        </CliButton>
        <CliButton href={SITE.github} target="_blank">
          <GithubIcon className="h-4 w-4" /> {SITE.githubHandle}
        </CliButton>
      </div>

      <div ref={teaserRef} className="mt-12 grid gap-5 sm:grid-cols-3">
        {HOME.teasers.map((t) => (
          <div key={t.to} data-reveal>
            <CliCard to={t.to} aria-label={t.title} className="h-full">
              <p className="font-cli text-cli-emphasis text-lg font-semibold">
                {t.title} <span aria-hidden className="text-cli-cyan">&rarr;</span>
              </p>
              <p className="cli-prose text-cli-text mt-2 text-sm">{t.blurb}</p>
            </CliCard>
          </div>
        ))}
      </div>
    </CliPanel>
  )
}
