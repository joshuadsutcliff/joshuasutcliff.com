import type { ReactNode } from 'react'

export interface CliSectionHeaderProps {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
  className?: string
  /** When true, a decorative horizontal rule fills the remaining width
      beside the label. Defaults to false so existing call sites are
      unchanged. */
  divider?: boolean
}

// Renders the "-[ SECTION NAME ]-" CLI heading treatment. A real semantic
// heading element sits behind the styling so the section name is announced
// normally by assistive tech; the decorative bracket glyphs are aria-hidden
// so a screen reader hears only the heading text.
export default function CliSectionHeader({
  children,
  as = 'h2',
  className = '',
  divider = false,
}: CliSectionHeaderProps) {
  const Heading = as
  const heading = (
    <Heading className={`font-cli text-cli-sakura flex items-center gap-1 tracking-wide ${className}`}>
      <span aria-hidden>-[</span>
      <span>{children}</span>
      <span aria-hidden>]-</span>
    </Heading>
  )

  if (!divider) {
    return heading
  }

  return (
    <div className="flex items-center gap-3">
      {heading}
      <div aria-hidden className="border-cli-dim/30 flex-1 border-t" />
    </div>
  )
}

export { CliSectionHeader }
