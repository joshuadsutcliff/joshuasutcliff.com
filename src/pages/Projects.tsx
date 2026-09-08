import { GithubIcon } from '../components/icons'
import { PROJECT_GROUPS } from '../content/projects'
import useReveal from '../hooks/useReveal'
import { prefersReducedMotion } from '../lib/motion'
import { CliPanel, CliSectionHeader, CliCard, CliButton, CliStatusDot } from '../components/cli'

type ProjectGroup = (typeof PROJECT_GROUPS)[number]

// Each group gets its own reveal container/observer. useReveal() returns a
// single ref, and a React ref object can only ever point at one element, so
// calling the hook once in a .map() over the groups (as this page used to
// do) meant every iteration overwrote the previous group's ref: only the
// last group ever got armed and observed. Hooks cannot be called inside a
// loop in the parent, so each group is its own component instead, giving
// each one its own call to useReveal() and therefore its own ref/observer.
function ProjectGroupSection({
  group,
  useViewTransition,
}: {
  group: ProjectGroup
  useViewTransition: boolean
}) {
  const gridRef = useReveal<HTMLDivElement>()

  return (
    <div className="mt-12">
      <CliSectionHeader as="h2" divider command={group.command}>
        {group.heading}
      </CliSectionHeader>
      <div ref={gridRef} className="mt-5 grid gap-5 sm:grid-cols-2">
        {group.cards.map((card) => (
          <div key={card.title} data-reveal>
            <CliCard
              to={card.slug ? `/projects/${card.slug}` : undefined}
              aria-label={card.slug ? card.title : undefined}
              padding="lg"
              className="flex flex-col"
            >
              <CliStatusDot
                status={card.statusTone === 'green' ? 'ok' : 'warn'}
                label={card.status}
              />
              <p className="font-cli text-cli-emphasis mt-3 text-lg font-semibold">
                {card.title}
              </p>
              <p className="cli-prose text-cli-text mt-2 text-sm">{card.tldr}</p>
              {card.note && <p className="cli-prose text-cli-dim mt-3 text-xs">{card.note}</p>}
              {(card.href || (card.secondaryHref && card.secondaryLabel)) && (
                <div className="relative z-10 mt-4 flex items-center gap-4">
                  {card.href && (
                    <CliButton href={card.href} target="_blank" aria-label="View on GitHub">
                      <GithubIcon className="h-4 w-4" />
                    </CliButton>
                  )}
                  {card.secondaryHref && card.secondaryLabel && (
                    <CliButton to={card.secondaryHref} viewTransition={useViewTransition}>
                      {card.secondaryLabel} &rarr;
                    </CliButton>
                  )}
                </div>
              )}
            </CliCard>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Projects() {
  const useViewTransition = !prefersReducedMotion()

  return (
    <CliPanel>
      <p className="font-cli text-cli-cyan text-[11px] tracking-[0.24em] uppercase">
        Projects
      </p>
      <h1 className="font-cli text-cli-emphasis mt-3 text-2xl tracking-tight sm:text-3xl">
        Things I build and run.
      </h1>

      {PROJECT_GROUPS.map((group) => (
        <ProjectGroupSection key={group.heading} group={group} useViewTransition={useViewTransition} />
      ))}
    </CliPanel>
  )
}
