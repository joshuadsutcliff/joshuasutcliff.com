import { useState } from 'react'
import { getSessionId } from '../../lib/sessionId'

export interface CliHeaderStripProps {
  className?: string
  /** Current route path (typically useLocation().pathname from the caller),
      rendered as a terminal prompt path: '/' reads as '~', anything else as
      '~/segment'. Optional so the strip still renders (without the route
      echo) if a caller has no router context. CliHeaderStrip is a
      presentational primitive and deliberately does not call useLocation
      itself, which would couple it to react-router; Layout.tsx already runs
      its own useLocation and passes the pathname down instead. */
  pathname?: string
}

// Terminal header strip: a live indicator, the current route as a prompt
// path, a per-session hex id (stable across route changes within a visit,
// see src/lib/sessionId.ts), and the ssh-style visitor line.
export default function CliHeaderStrip({ className = '', pathname }: CliHeaderStripProps) {
  // This app is a client-only SPA (no SSR), so reading/generating the
  // session id as lazy initial state is safe: it runs once, on the client,
  // before first paint, and getSessionId() is itself guarded against a
  // missing window/sessionStorage.
  const [sessionId] = useState(() => getSessionId())
  const route = pathname === undefined ? undefined : pathname === '/' ? '~' : `~${pathname}`

  // Decorative terminal chrome (live indicator, route echo, session hex,
  // ssh string). Hidden from the accessibility tree on purpose: it carries
  // no information for screen reader users that the real <nav> (via its
  // active-item state) doesn't already convey. Do not add interactive
  // content to this component without revisiting that decision.
  return (
    <div
      data-cli-header-strip
      className={`font-cli text-cli-text flex min-w-0 items-center justify-between gap-3 overflow-hidden text-xs ${className}`}
      aria-hidden
    >
      <span className="text-cli-green flex shrink-0 items-center gap-1.5">
        <span>&#9654;</span>
        LIVE
      </span>
      {route !== undefined && (
        <span className="text-cli-dim hidden min-w-0 truncate sm:inline">
          js@joshuasutcliff<span>:</span>
          <span className="text-cli-cyan">{route}</span>
        </span>
      )}
      <span className="text-cli-dim hidden shrink-0 md:inline">
        session <span className="text-cli-cyan">{sessionId}</span>
      </span>
      <span className="text-cli-dim shrink-0 truncate">ssh visitor@joshuasutcliff.com</span>
    </div>
  )
}

export { CliHeaderStrip }
