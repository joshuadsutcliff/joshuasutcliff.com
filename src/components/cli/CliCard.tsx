import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type CliCardPadding = 'md' | 'lg'

const PADDING: Record<CliCardPadding, string> = {
  md: 'p-6',
  lg: 'p-8 sm:p-12',
}

export interface CliCardProps {
  children: ReactNode
  /** When set, renders an overlay Link covering the whole card and turns on
      the hover lift treatment. Card content stays interactive underneath by
      sitting on its own stacking context (relative z-10), matching the
      pattern used for a clickable project card with its own inline link. */
  to?: string
  /** Accessible name for the overlay link. Required when `to` is set. */
  'aria-label'?: string
  padding?: CliCardPadding
  className?: string
}

/* The shared bordered content box: project cards, resume skill tiles and
   section boxes, and the project-detail overview/extra-section/changelog/
   screenshot boxes. Border treatment matches CliPanel (border-cli-dim/30) so
   cards and the page panel read as one system. */
export default function CliCard({
  children,
  to,
  'aria-label': ariaLabel,
  padding = 'md',
  className = '',
}: CliCardProps) {
  const base = `border-cli-dim/30 bg-cli-bg relative rounded-2xl border ${PADDING[padding]} ${className}`.trim()

  if (to === undefined) {
    return <div className={base}>{children}</div>
  }

  return (
    <div
      className={`${base} group motion-reduce:transition-none motion-reduce:hover:translate-y-0 transition-all duration-300 hover:-translate-y-1`}
    >
      <Link
        to={to}
        aria-label={ariaLabel}
        className="motion-reduce:transition-none absolute inset-0 rounded-2xl"
      />
      {children}
    </div>
  )
}

export { CliCard }
