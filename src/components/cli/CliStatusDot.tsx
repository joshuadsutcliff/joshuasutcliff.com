export type CliStatusDotStatus = 'ok' | 'active' | 'warn'

export interface CliStatusDotProps {
  status: CliStatusDotStatus
  label: string
  className?: string
}

const STATUS_COLOR: Record<CliStatusDotStatus, string> = {
  ok: 'bg-cli-green',
  active: 'bg-cli-cyan',
  warn: 'bg-cli-warn',
}

// "[●]" status indicator. The bracket glyphs and the dot are decorative and
// aria-hidden; the label is real text and carries the meaning. The pulse
// animation is disabled under prefers-reduced-motion (see the global rule in
// src/index.css, which already zeroes animation-duration site-wide).
export default function CliStatusDot({ status, label, className = '' }: CliStatusDotProps) {
  return (
    <span className={`font-cli text-cli-text inline-flex items-center gap-1.5 text-sm ${className}`}>
      <span aria-hidden className="inline-flex items-center">
        [
        <span
          className={`mx-0.5 inline-block h-2 w-2 rounded-full ${STATUS_COLOR[status]} animate-pulse motion-reduce:animate-none`}
        />
        ]
      </span>
      {label}
    </span>
  )
}

export { CliStatusDot }
