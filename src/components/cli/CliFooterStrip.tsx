import CliStatusDot from './CliStatusDot'
import type { CliStatus } from './status'

export interface CliFooterStripProps {
  status?: string
  dotStatus?: CliStatus
  className?: string
}

// Terminal footer status line: a cyan prompt glyph, a status dot, and a
// short status message.
export default function CliFooterStrip({
  status = 'all systems nominal',
  dotStatus = 'ok',
  className = '',
}: CliFooterStripProps) {
  return (
    <div className={`font-cli text-cli-text flex items-center gap-2 text-xs ${className}`}>
      <span aria-hidden className="text-cli-cyan">
        &#10095;
      </span>
      <CliStatusDot status={dotStatus} label={status} />
    </div>
  )
}

export { CliFooterStrip }
