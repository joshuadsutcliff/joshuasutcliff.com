import type { CliStatus } from './status'

/* The dot consumes the one merged CLI status vocabulary (see status.ts).
   This alias is kept so existing imports of CliStatusDotStatus keep working. */
export type CliStatusDotStatus = CliStatus

export interface CliStatusDotProps {
  status: CliStatus
  label: string
  className?: string
}

/* 'active' and 'armed' are both cyan: same visual, different call-site
   wording. 'err' is sakura, matching the boot log's error class. */
const STATUS_COLOR: Record<CliStatus, string> = {
  ok: 'bg-cli-green',
  active: 'bg-cli-cyan',
  armed: 'bg-cli-cyan',
  warn: 'bg-cli-warn',
  err: 'bg-cli-sakura',
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
