import { Link } from 'react-router-dom'
import { MailIcon } from '../components/icons'
import { SITE } from '../content/site'
import { RESUME } from '../content/resume'
import { CliPanel, CliButton, CliCard, CliSectionHeader } from '../components/cli'

export default function Resume() {
  return (
    <CliPanel
      width="narrow"
      className="print:border-black print:bg-white"
      contentClassName="print:px-0 print:py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* Only heading on the page, so heading order cannot skip a
              level. */}
          <h1 className="font-cli text-cli-emphasis mt-3 text-2xl tracking-tight sm:text-3xl print:text-black">
            {SITE.name}
          </h1>
          <p className="font-cli text-cli-dim mt-1 print:text-black">{RESUME.experience[0].role}</p>
          <p className="font-cli text-cli-dim mt-1 text-xs print:text-black">
            {SITE.location} · {SITE.email} · github.com/{SITE.githubHandle}
          </p>
        </div>
        <CliButton variant="solid" href={`mailto:${SITE.email}`} className="print:hidden">
          <MailIcon /> Get in touch
        </CliButton>
      </div>

      <CliSectionHeader as="h2" divider className="mt-10">
        Summary
      </CliSectionHeader>
      <p className="cli-prose text-cli-text mt-3 print:text-black">{RESUME.summary}</p>

      <CliSectionHeader as="h2" divider className="mt-10">
        Skills
      </CliSectionHeader>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {RESUME.skills.map((s) => (
          <CliCard key={s.area} padding="md" className="print:border-black print:bg-white">
            <p className="font-cli text-cli-emphasis text-sm font-medium print:text-black">{s.area}</p>
            <p className="cli-prose text-cli-dim mt-1 text-xs print:text-black">{s.detail}</p>
          </CliCard>
        ))}
      </div>

      <CliSectionHeader as="h2" divider className="mt-10">
        Experience
      </CliSectionHeader>
      {RESUME.experience.map((e) => (
        <div key={e.role} className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-cli text-cli-emphasis font-medium print:text-black">
              {e.role} · <span className="text-cli-dim print:text-black">{e.org}</span>
            </p>
            <p className="font-cli text-cli-dim text-xs print:text-black">
              {e.where} · {e.when}
            </p>
          </div>
          <ul className="cli-prose text-cli-text mt-3 list-disc space-y-1.5 pl-5 text-sm print:text-black">
            {e.bullets.map((b) => (
              <li key={b.slice(0, 24)}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      <CliSectionHeader as="h2" divider className="mt-10">
        Education
      </CliSectionHeader>
      <p className="cli-prose text-cli-text mt-3 print:text-black">
        <span className="text-cli-emphasis font-semibold">{RESUME.education.school}</span> ·{' '}
        {RESUME.education.degree}
      </p>

      <p className="font-cli text-cli-dim mt-10 text-sm print:hidden">
        Selected work lives on the{' '}
        <Link to="/projects" className="text-cli-cyan hover:underline">
          projects page
        </Link>
        .
      </p>
    </CliPanel>
  )
}
