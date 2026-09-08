import { useMemo } from 'react'
import type { BootState } from '../../hooks/useBootSequence'
import { STATUS_CLASS, STATUS_LABEL } from './status'
import type { CliStatus } from './status'

export interface LogLine {
  text: string
  status: CliStatus
  note?: string
}

export interface CliBootLogProps {
  /** Full log for the page. Windowing is this component's job. */
  lines: LogLine[]
  boot: BootState
  className?: string
}

/* The log tails like a real terminal: only the most recent lines stay on
   screen, so the panel never grows past the fold and the progress bar at the
   end of the sequence is always visible. */
export const LOG_WINDOW_LINES = 16

export const UPLINK_TEXT = 'uplink to visitor terminal'

/* Renders a boot log and its uplink progress bar. Purely presentational and
   entirely aria-hidden: the real page content is always in the accessibility
   tree underneath, so nothing here is announced. Stage 5 makes the boot
   site-wide, which is why this renderer is a primitive rather than page
   local. */
export default function CliBootLog({ lines, boot, className = '' }: CliBootLogProps) {
  const visible = useMemo(
    () => lines.slice(0, boot.visibleLines).slice(-LOG_WINDOW_LINES),
    [lines, boot.visibleLines],
  )

  return (
    <div
      aria-hidden
      className={`font-cli flex flex-col justify-start text-[11px] leading-6 sm:text-xs ${className}`}
      style={{ minHeight: `${LOG_WINDOW_LINES * 1.5}rem` }}
    >
      {/* Keyed by index (plus text for readability): log copy can legitimately
          repeat a line, and a text-only key silently collides when it does. */}
      {visible.map((l, i) => (
        <div key={`${i}-${l.text}`} className="flex flex-wrap gap-x-2">
          <span className="text-cli-dim">&gt;&gt;</span>
          <span className="text-cli-text">{l.text}</span>
          <span className={STATUS_CLASS[l.status]}>{STATUS_LABEL[l.status]}</span>
          {l.note && <span className="text-cli-dim">{l.note}</span>}
        </div>
      ))}
      {boot.phase === 'uplink' && (
        <>
          <div className="flex flex-wrap gap-x-2">
            <span className="text-cli-dim">&gt;&gt;</span>
            <span className="text-cli-text">{UPLINK_TEXT}</span>
            <span className="text-cli-cyan">[ARMED]</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="bg-cli-dim/20 h-1.5 w-full max-w-md overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${boot.progress}%`,
                  background: 'linear-gradient(90deg, var(--cli-cyan), var(--cli-sakura))',
                }}
              />
            </div>
            <span className="text-cli-cyan tabular-nums">{boot.progress}%</span>
          </div>
        </>
      )}
    </div>
  )
}

export { CliBootLog }
