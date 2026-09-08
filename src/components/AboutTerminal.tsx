import { useMemo } from 'react'
import { MailIcon } from './icons'
import { SITE } from '../content/site'
import { ABOUT } from '../content/about'
import useBootSequence, { RESOLVE_FADE_MS } from '../hooks/useBootSequence'
import { CliHeaderStrip, CliKeyValue, CliFooterStrip } from './cli'

/* ---------------------------------------------------------------------------
   Wordmark. Not final copy, so it lives here as a single swappable constant.
--------------------------------------------------------------------------- */
export const WORDMARK = 'JS::LOG'
/* Splits the wordmark on its :: delimiter so the glyph can take the accent
   without hardcoding the text anywhere. */
function renderWordmark() {
  const i = WORDMARK.indexOf('::')
  if (i < 0) return WORDMARK
  return (
    <>
      {WORDMARK.slice(0, i)}
      <span className="text-cli-sakura">::</span>
      {WORDMARK.slice(i + 2)}
    </>
  )
}

const SUBHEAD = ':: CORE ::'

type Status = 'ok' | 'armed' | 'warn' | 'err'

interface LogLine {
  text: string
  status: Status
  note?: string
}

/* Boot log copy. A profile load, not a network audit: it draws only on
   material already public elsewhere on this site, namely the Work page
   summary, the About page biography, and the listed personal projects.
   Decorative only, and marked aria-hidden at the render site. */
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

/* The log tails like a real terminal: only the most recent lines stay on
   screen, so the panel never grows past the fold and the progress bar at the
   end of the sequence is always visible. */
const LOG_WINDOW_LINES = 16

const UPLINK_TEXT = 'uplink to visitor terminal'

const STATUS_LABEL: Record<Status, string> = {
  ok: '[OK]',
  armed: '[ARMED]',
  warn: '[WARN]',
  err: '[ERR]',
}

/* CLI palette only. Every value here is a token the contrast script checks;
   no opacity modifiers, no hardcoded hex. */
const STATUS_CLASS: Record<Status, string> = {
  ok: 'text-cli-green',
  armed: 'text-cli-cyan',
  warn: 'text-cli-warn',
  err: 'text-cli-sakura',
}

/* Operator status block. Real facts, so it stays in the accessibility tree. */
const STATUS_ROWS: Array<[string, string]> = [
  ['location', 'las cruces, new mexico'],
  ['role', 'contract it, systems and networking'],
  ['since', '2017'],
  ['instrument', 'trumpet'],
  ['status', 'open to a good problem'],
]

export default function AboutTerminal() {
  const boot = useBootSequence(LOG.length)
  const lines = useMemo(
    () => LOG.slice(0, boot.visibleLines).slice(-LOG_WINDOW_LINES),
    [boot.visibleLines],
  )
  const showBoot = !boot.resolved

  return (
    <section className="cli-scope bg-cli-bg mx-auto max-w-5xl px-6 py-20">
      <div className="border-cli-dim/30 bg-cli-bg overflow-hidden rounded-3xl border">
        {/* Header strip: decorative chrome, shared primitive. */}
        <div aria-hidden className="border-cli-dim/30 border-b px-4 py-3 sm:px-6">
          <CliHeaderStrip />
        </div>

        {showBoot && (
          <div className="px-4 py-6 sm:px-6">
            <div
              aria-hidden
              className="font-cli flex flex-col justify-start text-[11px] leading-6 sm:text-xs"
              style={{ minHeight: `${LOG_WINDOW_LINES * 1.5}rem` }}
            >
              {lines.map((l) => (
                <div key={l.text} className="flex flex-wrap gap-x-2">
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
                          background:
                            'linear-gradient(90deg, var(--cli-cyan), var(--cli-sakura))',
                        }}
                      />
                    </div>
                    <span className="text-cli-cyan tabular-nums">{boot.progress}%</span>
                  </div>
                </>
              )}
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={boot.skip}
                className="border-cli-dim/40 text-cli-dim hover:border-cli-cyan hover:text-cli-cyan font-cli rounded-full border px-4 py-2 text-[11px] tracking-[0.18em] uppercase transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Real content. Always in the DOM and in the accessibility tree from
            the first frame. The boot sequence only fades it in visually. */}
        <div
          className={`px-4 py-8 sm:px-6 sm:py-10 ${showBoot ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          style={{ transition: `opacity ${RESOLVE_FADE_MS}ms ease` }}
        >
          <p aria-hidden className="font-cli text-cli-emphasis text-lg tracking-[0.2em] sm:text-xl">
            {renderWordmark()}
          </p>
          <p aria-hidden className="font-cli text-cli-sakura mt-2 text-[11px] tracking-[0.24em] uppercase">
            {SUBHEAD}
          </p>

          <CliKeyValue
            className="mt-6 text-[11px] sm:text-xs"
            rows={STATUS_ROWS.map(([key, value]) => ({ key, value }))}
          />

          <hr className="border-cli-dim/30 my-8" />

          <p className="font-cli text-cli-cyan text-[11px] tracking-[0.24em] uppercase">
            {ABOUT.kicker}
          </p>
          {/* Only heading on the page, so heading order cannot skip a level. */}
          <h1 className="font-cli text-cli-emphasis mt-3 text-2xl tracking-tight sm:text-3xl">
            {ABOUT.headline}
          </h1>
          {/* Biography prose is deliberately Geologica (.cli-prose), not
              monospace: the two-typeface system is what keeps long-form
              reading comfortable inside the terminal panel. */}
          <div className="mt-6 space-y-5">
            {ABOUT.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="cli-prose">
                {p}
              </p>
            ))}
          </div>
          <div className="mt-8">
            <a
              href={`mailto:${SITE.email}`}
              className="bg-cli-cyan text-cli-bg font-cli inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:scale-[1.03]"
            >
              <MailIcon /> Say hello
            </a>
          </div>

          <hr className="border-cli-dim/30 my-8" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <CliFooterStrip status="online" dotStatus="ok" />
            <button
              type="button"
              onClick={boot.replay}
              className="border-cli-dim/40 text-cli-dim hover:border-cli-cyan hover:text-cli-cyan font-cli rounded-full border px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase transition-colors"
            >
              Replay boot
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
