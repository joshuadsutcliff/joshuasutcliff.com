import type { ReactNode } from 'react'

export interface CliChipProps {
  children: ReactNode
  className?: string
}

/* The small bordered pill: stack tags and the changelog date badge. Purely
   decorative/labelling, no interactivity. */
export default function CliChip({ children, className = '' }: CliChipProps) {
  return (
    <span
      className={`border-cli-dim/30 text-cli-dim font-cli inline-block rounded-full border px-3 py-1 text-xs ${className}`}
    >
      {children}
    </span>
  )
}

export { CliChip }
