import { MailIcon } from '../components/icons'
import { SITE } from '../content/site'
import { ABOUT } from '../content/about'

export default function About() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="hud-panel hud-panel-solid rounded-3xl p-8 sm:p-12">
        <p className="hud-eyebrow">{ABOUT.kicker}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {ABOUT.headline}
        </h1>
        <div className="mt-6">
          <a
            href={`mailto:${SITE.email}`}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
          >
            <MailIcon /> Say hello
          </a>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {ABOUT.paragraphs.map((p, i) => (
          <div
            key={p.slice(0, 24)}
            className={`hud-panel hud-panel-solid rounded-3xl p-8 ${i === 0 ? 'sm:col-span-2' : ''}`}
          >
            <p className="leading-relaxed text-muted">{p}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
