import type { ReactNode } from 'react'
import CliHeaderStrip from './CliHeaderStrip'

export interface CliPanelProps {
  children: ReactNode
  /** Merged onto the bordered panel, not onto the outer section. */
  className?: string
  /** Set false for a page that does not want the terminal header row. */
  showHeader?: boolean
}

/* The shared page frame for every CLI page: the centered section, the
   bordered rounded panel, and the terminal header row.

   cli-scope ownership: this component carries the class today, so no page
   hand-places it. When the site-wide shell lands it may take ownership of
   cli-scope instead. Nesting the class is harmless: the rules in
   src/index.css are plain descendant selectors, so an element inside two
   nested cli-scope ancestors matches the same rule once. */
export default function CliPanel({ children, className = '', showHeader = true }: CliPanelProps) {
  return (
    <section className="cli-scope bg-cli-bg mx-auto max-w-5xl px-6 py-20">
      <div
        className={`border-cli-dim/30 bg-cli-bg overflow-hidden rounded-3xl border ${className}`}
      >
        {showHeader && (
          /* Decorative chrome, shared primitive. */
          <div aria-hidden className="border-cli-dim/30 border-b px-4 py-3 sm:px-6">
            <CliHeaderStrip />
          </div>
        )}
        {children}
      </div>
    </section>
  )
}

export { CliPanel }
