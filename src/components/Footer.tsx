import { SITE } from '../content/site'
import { CliFooterStrip } from './cli'

/* CLI shell footer (stage 5a). The CC BY 4.0 attribution to Cameron Sutcliff
   is a licence obligation, not decoration: it stays visible as full-size
   .cli-prose body text on the contrast-verified --cli-text token, and is
   never collapsed, truncated, or hidden.

   The [data-secret-admin] marker stays on a visible element in the copyright
   line. useSecretAdmin listens at document level via
   closest('[data-secret-admin]'), so the only requirement is that the
   attribute survives on a visible, clickable element. */
export default function Footer() {
  return (
    <footer className="border-cli-dim/30 relative mt-8 border-t print:hidden">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <CliFooterStrip status="all systems nominal" dotStatus="ok" />

        <div className="mt-6 flex flex-col gap-2">
          <p className="font-cli text-cli-emphasis text-sm">{SITE.name}</p>
          <p className="font-cli text-cli-dim text-xs">{SITE.oneLiner}</p>
          <div className="font-cli mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <a
              href={SITE.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cli-cyan hover:underline"
            >
              github.com/{SITE.githubHandle}
            </a>
            <a href={`mailto:${SITE.email}`} className="text-cli-cyan hover:underline">
              {SITE.email}
            </a>
          </div>
        </div>

        {/* Attribution - CC BY 4.0 obligation to CAOS / Cameron Sutcliff */}
        <div className="border-cli-dim/30 mt-8 border-t pt-6">
          <p className="font-cli text-cli-cyan text-[11px] tracking-[0.24em] uppercase">Built on</p>
          <p className="cli-prose mt-2 max-w-2xl">{SITE.attribution.text}</p>
          <div className="font-cli mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <a
              href={SITE.attribution.caosSite}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cli-cyan hover:underline"
            >
              CAOS <span aria-hidden>&#8599;</span>
            </a>
            <a
              href={SITE.attribution.caosRepo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cli-cyan hover:underline"
            >
              source repo <span aria-hidden>&#8599;</span>
            </a>
          </div>
        </div>

        <div className="border-cli-dim/30 font-cli text-cli-dim mt-6 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="text-cli-text">
            <span data-secret-admin>&copy;</span> {SITE.name}. Doctrine contributions &copy;{' '}
            {SITE.attribution.caosAuthor}, CC BY 4.0.
          </span>
          <span>{SITE.tagline}</span>
        </div>
      </div>
    </footer>
  )
}
