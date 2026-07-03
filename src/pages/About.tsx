import { MailIcon } from '../components/icons'
import { SITE } from '../content/site'
import { ABOUT } from '../content/about'

export default function About() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <div className="glass rounded-3xl p-8 sm:p-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">{ABOUT.kicker}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {ABOUT.headline}
        </h1>
        <div className="mt-6 space-y-5">
          {ABOUT.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="leading-relaxed text-muted">
              {p}
            </p>
          ))}
        </div>
        <div className="mt-8">
          <a
            href={`mailto:${SITE.email}`}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
          >
            <MailIcon /> Say hello
          </a>
        </div>
      </div>
    </section>
  )
}
