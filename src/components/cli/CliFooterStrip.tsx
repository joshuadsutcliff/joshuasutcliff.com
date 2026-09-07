import CliStatusDot from './CliStatusDot'

export interface CliFooterStripProps {
  status?: string
  className?: string
}

// Terminal footer status line: a cyan prompt glyph, a status dot, and a
// short status message.
export default function CliFooterStrip({ status = 'all systems nominal', className = '' }: CliFooterStripProps) {
  return (
    <div className={`font-cli text-cli-text flex items-center gap-2 text-xs ${className}`}>
      <span aria-hidden className="text-cli-cyan">
        &#10095;
      </span>
      <CliStatusDot status="ok" label={status} />
    </div>
  )
}

export { CliFooterStrip }
