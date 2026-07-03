import ParticleField from './ParticleField'
import ThemeToggle from './ThemeToggle'
import { SITE, SYSTEM } from '../content/system'

function GithubIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.93c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.42.37.8 1.1.8 2.22v3.29c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  )
}

export default function Hero() {
  return (
    <header className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(var(--purple-rgb), 0.14), transparent 70%), radial-gradient(50% 40% at 80% 20%, rgba(var(--cyan-rgb), 0.12), transparent 70%)',
        }}
      />
      <ParticleField />

      <nav className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-mono text-sm tracking-tight text-muted">
          js<span className="text-cyan">.</span>
        </span>
        <div className="flex items-center gap-3">
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="glass grid h-10 w-10 place-items-center rounded-full text-fg transition-colors"
          >
            <GithubIcon />
          </a>
          <ThemeToggle />
        </div>
      </nav>

      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-16 sm:pt-24">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan" /> AI-native · agentic systems
        </p>
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-7xl">
          {SITE.name}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted sm:text-xl">
          {SITE.tagline}{' '}
          <span className="text-fg">{SITE.subtagline}</span>
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href={SYSTEM.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-gradient-to-r from-cyan to-purple px-6 py-3 text-sm font-medium text-white shadow-[var(--shadow-neon)] transition-transform hover:scale-[1.03]"
          >
            Explore {SYSTEM.name}
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
      </div>
    </header>
  )
}
