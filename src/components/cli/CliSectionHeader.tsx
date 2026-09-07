import type { ReactNode } from 'react'

export interface CliSectionHeaderProps {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
  className?: string
}

// Renders the "-[ SECTION NAME ]-" CLI heading treatment. A real semantic
// heading element sits behind the styling so the section name is announced
// normally by assistive tech; the decorative bracket glyphs are aria-hidden
// so a screen reader hears only the heading text.
export default function CliSectionHeader({ children, as = 'h2', className = '' }: CliSectionHeaderProps) {
  const Heading = as
  return (
    <Heading
      className={`font-cli text-cli-sakura flex items-center gap-1 tracking-wide ${className}`}
    >
      <span aria-hidden>-[</span>
      <span>{children}</span>
      <span aria-hidden>]-</span>
    </Heading>
  )
}

export { CliSectionHeader }
