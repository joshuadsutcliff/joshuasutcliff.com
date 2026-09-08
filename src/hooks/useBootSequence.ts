import { useCallback, useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/motion'

/* ---------------------------------------------------------------------------
   Timing. Every duration in the boot sequence is named here so a pacing
   change is a one-line edit. All values are milliseconds measured from the
   moment the shell arms the boot (first arrival at a non-excluded route).
--------------------------------------------------------------------------- */

/** Panel stays empty this long before the first log line appears. */
export const BOOT_START_DELAY_MS = 2500
/** Gap between consecutive log lines. THIS IS THE PACING TUNING KNOB: the
    owner wants roughly 90 to 110 ms per line and will tune from here, so it
    stays a named exported constant and is never inlined at a call site. */
export const LOG_LINE_INTERVAL_MS = 100
/** Pause after the last log line before the uplink line and bar appear. */
export const UPLINK_DELAY_MS = 200
/** How long the progress bar takes to run from 0 to 100 percent. */
export const PROGRESS_DURATION_MS = 1000
/** Pause after the bar completes before the panel resolves. */
export const RESOLVE_DELAY_MS = 200
/** Clock granularity. Drives both line reveal and bar interpolation. */
export const BOOT_TICK_MS = 40
/** Fade used when the resolved content crosses in. */
export const RESOLVE_FADE_MS = 450

/** sessionStorage marker so the boot plays at most once per session.
    The key is site-wide ('cli-booted'), not per-page: since stage 5b the
    shell (Layout.tsx, via BootOverlay.tsx) is the ONLY caller of this hook,
    so the flag means "this visit has already seen the boot", whichever page
    the visitor happened to land on first. Reading it as already set by an
    earlier arrival at a different page in the same browser session IS the
    suppression the design asks for.

    Nothing clears this key. In particular replay() deliberately does not:
    a page-local replay control that cleared a site-wide flag would re-arm
    the whole-site boot on the next navigation. See replay() below. */
const SESSION_KEY = 'cli-booted'

function hasBooted(): boolean {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return false
    return window.sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function markBooted(value: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    if (value) window.sessionStorage.setItem(SESSION_KEY, '1')
    else window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage failures (privacy mode, quota, etc).
  }
}

export type BootPhase = 'idle' | 'log' | 'uplink' | 'resolved'

export interface BootState {
  phase: BootPhase
  /** How many log lines are currently revealed. */
  visibleLines: number
  /** Progress bar fill, 0 to 100. */
  progress: number
  /** True once the real content should be visible. */
  resolved: boolean
  /** True when this render never animated (reduced motion or repeat visit). */
  instant: boolean
  skip: () => void
  replay: () => void
}

/* enabled: false parks the hook without running the clock and without
   writing the session flag, which is how the shell excludes a route from the
   boot (see BOOT_EXCLUDED_PREFIXES in BootOverlay.tsx). Parking rather than
   unmounting matters: the hook lives in the persistent shell, so a
   conditional call site would violate the rules of hooks, and a conditional
   MOUNT would restart the boot on every navigation. Landing on an excluded
   route therefore does not silently consume the visit's one boot; the first
   non-excluded route still gets it. */
export default function useBootSequence(lineCount: number, enabled = true): BootState {
  const logEnd = BOOT_START_DELAY_MS + lineCount * LOG_LINE_INTERVAL_MS
  const progressStart = logEnd + UPLINK_DELAY_MS
  const progressEnd = progressStart + PROGRESS_DURATION_MS
  const totalMs = progressEnd + RESOLVE_DELAY_MS

  // Decided once, at mount, so a mid-boot re-render cannot restart it.
  const [instant, setInstant] = useState(() => prefersReducedMotion() || hasBooted())
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const [runId, setRunId] = useState(0)
  const startedAt = useRef(0)

  // Start (or restart) the clock whenever we are in an animating state.
  useEffect(() => {
    if (!enabled) return
    if (instant) {
      markBooted(true)
      return
    }
    // A boot that already finished naturally (running === false) must not
    // re-arm an interval on a park-then-unpark transition (e.g. a detour
    // through an excluded route and back). `running` is the same signal
    // `resolved` below reads as `!running`, so the guard here and that
    // derivation agree: once running is false, only replay() (which sets it
    // back to true) can start the clock again.
    if (!running) return
    startedAt.current = Date.now()
    const id = window.setInterval(() => {
      const next = Date.now() - startedAt.current
      setElapsed(next)
      if (next >= totalMs) {
        window.clearInterval(id)
        setRunning(false)
        markBooted(true)
      }
    }, BOOT_TICK_MS)
    return () => window.clearInterval(id)
  }, [enabled, instant, running, totalMs, runId])

  const skip = useCallback(() => {
    setInstant(true)
    setRunning(false)
    markBooted(true)
  }, [])

  /* Re-runs the boot for the current view only. It intentionally leaves the
     'cli-booted' session flag SET, so navigating away and back afterwards
     does not re-trigger the site-wide boot. Reduced motion is not consulted
     here on purpose: this fires only from an explicit user click. */
  const replay = useCallback(() => {
    setInstant(false)
    setElapsed(0)
    startedAt.current = Date.now()
    setRunning(true)
    setRunId((n) => n + 1)
  }, [])

  if (!enabled || instant) {
    return {
      phase: 'resolved',
      visibleLines: lineCount,
      progress: 100,
      resolved: true,
      instant: true,
      skip,
      replay,
    }
  }

  const visibleLines =
    elapsed < BOOT_START_DELAY_MS
      ? 0
      : Math.min(lineCount, Math.floor((elapsed - BOOT_START_DELAY_MS) / LOG_LINE_INTERVAL_MS) + 1)

  const progress =
    elapsed <= progressStart
      ? 0
      : Math.min(100, Math.round(((elapsed - progressStart) / PROGRESS_DURATION_MS) * 100))

  const resolved = elapsed >= totalMs || !running
  const phase: BootPhase = resolved ? 'resolved' : elapsed >= logEnd ? 'uplink' : 'log'

  return { phase, visibleLines, progress, resolved, instant: false, skip, replay }
}
