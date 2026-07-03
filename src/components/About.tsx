import { SITE } from '../content/system'

export default function About() {
  return (
    <section id="about" className="relative mx-auto max-w-3xl px-6 py-20">
      <div className="glass rounded-3xl p-8 sm:p-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">About</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg">
          Operator, not just a user.
        </h2>
        <p className="mt-5 leading-relaxed text-muted">
          I build the scaffolding that makes AI agents dependable: hooks that enforce limits,
          contracts that make work verifiable, and a memory that compounds instead of resetting.
          Most of the practice is private R&amp;D; this site is the part worth sharing.
        </p>
        <p className="mt-4 leading-relaxed text-muted">
          The throughline is simple: if a rule matters, don&rsquo;t write it down and hope.
          Enforce it in code.
        </p>
        <div className="mt-7">
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
          >
            Find me on GitHub →
          </a>
        </div>
      </div>
    </section>
  )
}
