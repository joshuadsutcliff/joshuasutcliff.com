import { WORK } from '../content/work'
import { CliPanel, CliButton } from '../components/cli'

export default function Work() {
  return (
    <CliPanel width="narrow">
      <p className="font-cli text-cli-cyan text-[11px] tracking-[0.24em] uppercase">
        {/* /work is a single prose panel with no section headings, so the
            terminal prefix attaches to the kicker rather than inventing a
            heading that has no section under it. Decorative and
            aria-hidden, matching the nav marker treatment in Layout. */}
        <span aria-hidden>&gt;&nbsp;</span>
        {WORK.kicker}
      </p>
      <h1 className="font-cli text-cli-emphasis mt-3 text-2xl tracking-tight sm:text-3xl">
        {WORK.headline}
      </h1>
      <div className="mt-8 space-y-5">
        {WORK.paragraphs.map((p) => (
          <p key={p.slice(0, 24)} className="cli-prose">
            {p}
          </p>
        ))}
      </div>
      <div className="mt-10">
        <CliButton to={WORK.cta.to} variant="solid">
          {WORK.cta.label} <span aria-hidden>&rarr;</span>
        </CliButton>
      </div>
    </CliPanel>
  )
}
