import type { ReactNode } from 'react'
import CliHeaderStrip from './CliHeaderStrip'

export type CliPanelWidth = 'default' | 'narrow'

/* The single shared inner content padding for a CLI page. CliPanel applies
   this by default (see padded below); a page that must opt out of the
   single wrapper (About, which staggers two differently padded regions)
   imports this constant instead of hand-rolling the string, so the value
   still lives in exactly one place. */
export const CLI_CONTENT_PADDING = 'px-4 py-8 sm:px-6 sm:py-10'

const WIDTH: Record<CliPanelWidth, string> = {
  default: 'max-w-5xl',
  narrow: 'max-w-3xl',
}

export interface CliPanelProps {
  children: ReactNode
  /** Merged onto the bordered panel, not onto the outer section. */
  className?: string
  /** Set true for a page that wants its own terminal header row inside the
      panel. Defaults to false: since stage 5a the site-wide shell in
      Layout.tsx owns the one persistent terminal header strip, so a panel
      that mounted its own would render a second one. */
  showHeader?: boolean
  /** Outer section max width. 'default' keeps max-w-5xl; 'narrow' gives the
      max-w-3xl column a long-form page like Resume needs. This is the only
      knob into the outer section; className stays scoped to the inner
      panel. */
  width?: CliPanelWidth
  /** When true (the default), children are wrapped in the standard content
      padding (px-4 py-8 sm:px-6 sm:py-10) so every page gets identical
      inset without hand-rolling the wrapper. Set false when a page manages
      its own padding at a finer grain than a single wrapper allows, as
      About does for its boot log versus its resolved content. */
  padded?: boolean
  /** Merged onto the padding wrapper div when padded is true. Lets a page
      layer print-only padding overrides (see Resume) without breaking the
      single shared source of the base padding string. */
  contentClassName?: string
}

/* The shared page frame for every CLI page: the centered section, the
   bordered rounded panel, and the terminal header row.

   cli-scope ownership: the stage 5a shell (Layout.tsx) now also carries the
   class on its root, so every page inherits the CLI focus ring. This
   component keeps it too, because StyleGuide renders CLI primitives in a
   standalone column outside any panel and still needs the scope. Nesting the
   class is harmless: the rules in src/index.css are plain descendant
   selectors, so an element inside two nested cli-scope ancestors matches the
   same rule once. */
export default function CliPanel({
  children,
  className = '',
  showHeader = false,
  width = 'default',
  padded = true,
  contentClassName = '',
}: CliPanelProps) {
  return (
    <section className={`cli-scope bg-cli-bg mx-auto px-6 py-20 print:py-4 ${WIDTH[width]}`}>
      <div
        className={`border-cli-dim/30 bg-cli-bg overflow-hidden rounded-3xl border ${className}`}
      >
        {showHeader && (
          /* Decorative chrome, shared primitive. Hidden from print via the
             .cli-header-strip-row rule in src/index.css: it carries no
             information (already aria-hidden) and prints in color, which
             looks wrong on a monochrome page. */
          <div aria-hidden className="cli-header-strip-row border-cli-dim/30 border-b px-4 py-3 sm:px-6">
            <CliHeaderStrip />
          </div>
        )}
        {padded ? (
          <div className={`${CLI_CONTENT_PADDING} ${contentClassName}`}>{children}</div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

export { CliPanel }
