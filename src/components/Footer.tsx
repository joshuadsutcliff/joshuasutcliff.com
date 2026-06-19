import { SITE, ATTRIBUTION } from '../content/system'

export default function Footer() {
  return (
    <footer className="relative mt-8 border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-fg">{SITE.name}</p>
            <p className="mt-1 text-sm text-muted">{SITE.subtagline}</p>
            <a
              href={SITE.github}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block font-mono text-xs text-cyan hover:underline"
            >
              github.com/{SITE.githubHandle}
            </a>
          </div>

          {/* Attribution — CC BY 4.0 obligation to CAOS / Cameron Sutcliff */}
          <div className="max-w-md">
            <p className="font-mono text-[11px] uppercase tracking-wider text-dim">Built on</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{ATTRIBUTION.text}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
              <a
                href={ATTRIBUTION.caosSite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan hover:underline"
              >
                CAOS ↗
              </a>
              <a
                href={ATTRIBUTION.caosRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan hover:underline"
              >
                source repo ↗
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between">
          <span>© {SITE.name}. Doctrine contributions © {ATTRIBUTION.caosAuthor}, CC BY 4.0.</span>
          <span className="font-mono">The public face of a private R&amp;D habit.</span>
        </div>
      </div>
    </footer>
  )
}
