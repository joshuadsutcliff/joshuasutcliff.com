import { Link } from 'react-router-dom'
import { MailIcon } from '../components/icons'
import { SITE } from '../content/site'
import { RESUME } from '../content/resume'

export default function Resume() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 print:py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">{SITE.name}</h1>
          <p className="mt-1 text-muted">{RESUME.experience[0].role}</p>
          <p className="mt-1 font-mono text-xs text-dim">
            {SITE.location} · {SITE.email} · github.com/{SITE.githubHandle}
          </p>
        </div>
        <a
          href={`mailto:${SITE.email}`}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03] print:hidden"
        >
          <MailIcon /> Get in touch
        </a>
      </div>

      <h2 className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-cyan">Summary</h2>
      <p className="mt-3 leading-relaxed text-muted">{RESUME.summary}</p>

      <h2 className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-cyan">Skills</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {RESUME.skills.map((s) => (
          <div key={s.area} className="glass rounded-xl p-4">
            <p className="text-sm font-medium text-fg">{s.area}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.detail}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-cyan">Experience</h2>
      {RESUME.experience.map((e) => (
        <div key={e.role} className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium text-fg">
              {e.role} · <span className="text-muted">{e.org}</span>
            </p>
            <p className="font-mono text-xs text-dim">
              {e.where} · {e.when}
            </p>
          </div>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
            {e.bullets.map((b) => (
              <li key={b.slice(0, 24)}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      <h2 className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-cyan">Education</h2>
      <p className="mt-3 text-muted">
        <span className="font-medium text-fg">{RESUME.education.school}</span> · {RESUME.education.degree}
      </p>

      <p className="mt-10 text-sm text-dim print:hidden">
        Selected work lives on the <Link to="/projects" className="text-cyan hover:underline">projects page</Link>.
      </p>
    </section>
  )
}
