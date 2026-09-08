import { useEffect, useState, type ReactNode } from 'react'
import useBootSequence, { RESOLVE_FADE_MS } from '../hooks/useBootSequence'
import { BootReplayContext } from '../hooks/bootReplay'
import { CliBootLog, CliButton } from './cli'
import type { LogLine } from './cli'

/* Boot log copy. A profile load, not a network audit: it draws only on
   material already public elsewhere on this site, namely the Work page
   summary, the About page biography, and the listed personal projects.
   Decorative only, and marked aria-hidden at the render site.

   Stage 5b moved this verbatim out of AboutTerminal: the boot is the SITE's
   boot now, and an operator-profile load reads correctly as the whole site
   coming up, so no line of it changed. */
const LOG: LogLine[] = [
  { text: 'kernel handoff', status: 'ok' },
  { text: 'hostname jsutcliff', status: 'ok' },
  { text: 'site las cruces, new mexico', status: 'ok' },
  { text: 'operator contract it, since 2017', status: 'ok' },
  { text: 'mount /profile/operator', status: 'ok' },
  { text: 'load /education/information-systems-management', status: 'ok', note: 'auburn university' },
  { text: 'mount /skills', status: 'ok' },
  { text: 'load /skills/systems-administration', status: 'ok' },
  { text: 'load /skills/windows-server-and-active-directory', status: 'ok' },
  { text: 'load /skills/firewalls-and-managed-switching', status: 'ok' },
  { text: 'load /skills/mobile-device-management', status: 'ok' },
  { text: 'load /skills/backup-and-recovery', status: 'ok' },
  { text: 'load /skills/monitoring', status: 'ok' },
  { text: 'index /skills complete', status: 'ok' },
  { text: 'mount /projects', status: 'ok' },
  { text: 'load /projects/home-lab', status: 'ok' },
  { text: 'load /projects/nexus-system-monitor', status: 'ok' },
  { text: 'load /projects/ghostpane', status: 'ok' },
  { text: 'load /projects/agentic-monitoring-stack', status: 'ok' },
  { text: 'load /projects/this-website', status: 'ok', note: 'you are here' },
  { text: 'load /music/trumpet', status: 'ok', note: 'since sixth grade' },
  { text: 'load /music/drum-corps', status: 'ok', note: 'crown, spirit of atlanta' },
  { text: 'load /music/marching-band', status: 'ok', note: 'auburn, three seasons' },
  { text: 'metronome', status: 'armed' },
  { text: 'embouchure', status: 'warn', note: 'out of practice' },
  { text: 'mount /offline', status: 'ok' },
  { text: 'load /offline/gaming-pc-builds', status: 'ok' },
  { text: 'load /offline/minecraft-servers', status: 'ok', note: 'friends only' },
  { text: 'load /offline/mountains', status: 'ok', note: 'bow, rifle, muzzleloader' },
  { text: 'coffee reserve', status: 'err', note: 'refill required' },
  { text: 'home lab heartbeat', status: 'ok' },
  { text: 'documentation index rebuilt', status: 'ok' },
  { text: 'curiosity', status: 'armed' },
  { text: 'all subsystems nominal', status: 'ok' },
  { text: 'SYSTEM READY', status: 'ok' },
]

/* Routes that never get interrupted by the boot.

   /admin is a working tool behind a secret entry: a visitor who reaches it is
   mid-task, not arriving at the site. /styleguide is an unlinked reviewer
   proof route and renders CliBootLog as a frozen sample, so a real boot on
   top of it would be actively confusing. Prefix matching covers nested paths
   under both.

   /baton is excluded structurally rather than by prefix: App.tsx mounts it as
   a sibling of the Layout route, so it never renders this shell at all.
   Everything else inside the shell DOES boot, including /projects/:slug and
   /guides/obsidian-claude-setup. */
const BOOT_EXCLUDED_PREFIXES = ['/admin', '/styleguide']

function isBootRoute(pathname: string): boolean {
  return !BOOT_EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export interface BootOverlayProps {
  pathname: string
  children: ReactNode
}

/* The site-wide boot (stage 5b).

   Placement: a full-viewport fixed overlay, NOT an in-flow block. The boot is
   the site coming up, so it should own the viewport and then dissolve into
   the page. An in-flow boot would also have to reserve or reflow real layout
   on every route, and would sit below the fold on a long page.

   Accessibility: the overlay is purely visual. The real page renders
   underneath at full opacity, in the DOM and in the accessibility tree from
   the first frame, so a crawler or a screen reader sees the page immediately
   and nothing is gated behind conditional rendering. The log itself is
   aria-hidden (inside CliBootLog); the Skip control is a real button and is
   the first thing in tab order.

   Remount: this component and its hook live in the persistent shell, ABOVE
   the <main key={pathname}> that Layout remounts per route, so a navigation
   cannot restart or flash the boot. */
export default function BootOverlay({ pathname, children }: BootOverlayProps) {
  const enabled = isBootRoute(pathname)
  const boot = useBootSequence(LOG.length, enabled)

  /* Unmount only after the fade-out finishes, so the overlay never leaves a
     focusable Skip button parked in tab order once the site is up. The reset
     is done during render, not in the effect: a replay flips resolved back to
     false and the overlay must be mountable again on that same render, and
     React's documented "adjust state while rendering" pattern converges
     immediately (the setter is guarded by the current value, so it runs at
     most once). */
  const [gone, setGone] = useState(false)
  if (gone && !boot.resolved) setGone(false)
  useEffect(() => {
    if (!boot.resolved) return
    const id = window.setTimeout(() => setGone(true), RESOLVE_FADE_MS)
    return () => window.clearTimeout(id)
  }, [boot.resolved])

  const show = !boot.instant && !gone

  return (
    <BootReplayContext.Provider value={boot.replay}>
      {show && (
        <div
          className={`bg-cli-bg fixed inset-0 z-50 overflow-y-auto print:hidden ${
            boot.resolved ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}
          style={{ transition: `opacity ${RESOLVE_FADE_MS}ms ease` }}
        >
          <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
            <CliBootLog lines={LOG} boot={boot} />
            <div className="mt-5">
              <CliButton onClick={boot.skip}>Skip</CliButton>
            </div>
          </div>
        </div>
      )}
      {children}
    </BootReplayContext.Provider>
  )
}
