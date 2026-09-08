import { useState } from 'react'
import { getSessionId } from '../../lib/sessionId'

export interface CliHeaderStripProps {
  className?: string
}

// Terminal header strip: a live indicator, a per-session hex id (stable
// across route changes within a visit, see src/lib/sessionId.ts), and the
// ssh-style visitor line.
export default function CliHeaderStrip({ className = '' }: CliHeaderStripProps) {
  // This app is a client-only SPA (no SSR), so reading/generating the
  // session id as lazy initial state is safe: it runs once, on the client,
  // before first paint, and getSessionId() is itself guarded against a
  // missing window/sessionStorage.
  const [sessionId] = useState(() => getSessionId())

  // Decorative terminal chrome (live indicator, session hex, ssh string).
  // Hidden from the accessibility tree on purpose: contains no information
  // or interaction for screen reader users. Do not add interactive or
  // informational content to this component without revisiting that decision.
  return (
    <div
      data-cli-header-strip
      className={`font-cli text-cli-text flex items-center justify-between gap-4 text-xs ${className}`}
      aria-hidden
    >
      <span className="text-cli-green flex items-center gap-1.5">
        <span>&#9654;</span>
        LIVE
      </span>
      <span className="text-cli-dim">
        session <span className="text-cli-cyan">{sessionId}</span>
      </span>
      <span className="text-cli-dim">ssh visitor@joshuasutcliff.com</span>
    </div>
  )
}

export { CliHeaderStrip }
