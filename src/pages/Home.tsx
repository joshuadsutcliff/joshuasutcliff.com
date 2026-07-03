import { Link } from 'react-router-dom'
import ParticleField from '../components/ParticleField'
import { GithubIcon, MailIcon } from '../components/icons'
import { SITE } from '../content/site'
import { HOME } from '../content/home'

export default function Home() {
  return (
    <div className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(var(--purple-rgb), 0.14), transparent 70%), radial-gradient(50% 40% at 80% 20%, rgba(var(--cyan-rgb), 0.12), transparent 70%)',
        }}
      />
      <ParticleField />

      <section className="relative mx-auto max-w-5xl px-6 pb-16 pt-14 sm:pt-20">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan" /> {SITE.location}
        </p>
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-7xl">
          {SITE.name}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-fg sm:text-xl">{SITE.oneLiner}</p>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted">{HOME.intro}</p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href={`mailto:${SITE.email}`}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-6 py-3 text-sm font-medium text-white shadow-[var(--shadow-neon)] transition-transform hover:scale-[1.03]"
          >
            <MailIcon /> Get in touch
          </a>
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-fg"
          >
            <GithubIcon /> {SITE.githubHandle}
          </a>
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-3">
          {HOME.teasers.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="glass group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
            >
              <p className="font-display text-lg font-semibold text-fg">
                {t.title} <span className="text-cyan transition-transform group-hover:translate-x-0.5">→</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
