import { useMemo, useState } from 'react'
import { MailIcon } from './icons'
import { SITE } from '../content/site'
import { ABOUT } from '../content/about'
import useBootSequence, { RESOLVE_FADE_MS } from '../hooks/useBootSequence'

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
      <span className="text-accent-sakura">::</span>
      {WORDMARK.slice(i + 2)}
    </>
  )
}

const SUBHEAD = ':: CORE ::'
const SSH_STRING = 'ssh visitor@joshuasutcliff.com'

type Status = 'ok' | 'armed' | 'warn' | 'err'

interface LogLine {
  text: string
  status: Status
  note?: string
}

/* Boot log copy. Drawn from the real background: contract IT in southern
   New Mexico since 2017, Windows Server and Active Directory, firewalls and
   managed switching, MDM, backup and recovery, monitoring, plus trumpet and
   drum corps. Decorative only, and marked aria-hidden at the render site. */
const LOG: LogLine[] = [
  { text: 'kernel handoff', status: 'ok' },
  { text: 'hostname jsutcliff', status: 'ok' },
  { text: 'site las cruces, new mexico', status: 'ok' },
  { text: 'operator contract it, since 2017', status: 'ok' },
  { text: 'mount /roles/systems-administration', status: 'ok' },
  { text: 'mount /roles/networking', status: 'ok' },
  { text: 'probing windows server hosts', status: 'ok' },
  { text: 'active directory forest reachable', status: 'ok' },
  { text: 'fsmo roles located', status: 'ok' },
  { text: 'dns zones replicating', status: 'ok' },
  { text: 'group policy objects parsed', status: 'ok' },
  { text: 'dhcp scopes bound', status: 'ok' },
  { text: 'edge firewall policy loaded', status: 'ok' },
  { text: 'managed switching, vlans up', status: 'ok' },
  { text: 'wireless controller adopted', status: 'ok' },
  { text: 'site to site tunnels established', status: 'ok' },
  { text: 'certificate store validated', status: 'warn', note: 'renewal window open' },
  { text: 'mdm enrollment, tablet fleet', status: 'ok' },
  { text: 'app deployment tokens current', status: 'ok' },
  { text: 'backup targets reachable', status: 'ok' },
  { text: 'restore test verified', status: 'ok' },
  { text: 'monitoring agents reporting', status: 'ok' },
  { text: 'dashboards and alert routing', status: 'armed' },
  { text: 'ticket queue', status: 'warn', note: 'never empty' },
  { text: 'patch ring one', status: 'ok' },
  { text: 'patch ring two', status: 'err', note: 'retry scheduled' },
  { text: 'load /music/trumpet', status: 'ok', note: 'since sixth grade' },
  { text: 'drum corps 2008 and 2009', status: 'ok', note: 'crown, spirit of atlanta' },
  { text: 'marching band, three seasons', status: 'ok', note: 'auburn university' },
  { text: 'metronome', status: 'armed' },
  { text: 'home lab heartbeat', status: 'ok' },
  { text: 'documentation index rebuilt', status: 'ok' },
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

const STATUS_CLASS: Record<Status, string> = {
  ok: 'text-accent-cli',
  armed: 'text-cyan',
  warn: 'text-[#f59e0b]',
  err: 'text-accent-sakura',
}

/* Operator status block. Real facts, so it stays in the accessibility tree. */
const STATUS_ROWS: Array<[string, string]> = [
  ['location', 'las cruces, new mexico'],
  ['role', 'contract it, systems and networking'],
  ['since', '2017'],
  ['instrument', 'trumpet'],
  ['status', 'open to a good problem'],
]

function sessionHex(): string {
  let out = ''
  for (let i = 0; i < 8; i += 1) out += Math.floor(Math.random() * 16).toString(16)
  return out
}

export default function AboutTerminal() {
  const boot = useBootSequence(LOG.length)
  const [hex] = useState(sessionHex)
  const lines = useMemo(
    () => LOG.slice(0, boot.visibleLines).slice(-LOG_WINDOW_LINES),
    [boot.visibleLines],
  )
  const showBoot = !boot.resolved

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="hud-panel hud-panel-solid overflow-hidden rounded-3xl">
        {/* Header strip: decorative chrome. */}
        <div
          aria-hidden
          className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 font-mono text-[10px] tracking-[0.14em] uppercase sm:px-6 sm:text-[11px]"
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-accent-cli">&#9654;</span>
            <span className="text-accent-cli">LIVE</span>
            <span className="text-dim">{hex}</span>
          </span>
          <span className="truncate text-dim">{SSH_STRING}</span>
        </div>

        {showBoot && (
          <div className="px-4 py-6 sm:px-6">
            <div
              aria-hidden
              className="flex flex-col justify-start font-mono text-[11px] leading-6 sm:text-xs"
              style={{ minHeight: `${LOG_WINDOW_LINES * 1.5}rem` }}
            >
              {lines.map((l) => (
                <div key={l.text} className="flex flex-wrap gap-x-2">
                  <span className="text-dim">&gt;&gt;</span>
                  <span className="text-muted">{l.text}</span>
                  <span className={STATUS_CLASS[l.status]}>{STATUS_LABEL[l.status]}</span>
                  {l.note && <span className="text-dim">{l.note}</span>}
                </div>
              ))}
              {boot.phase === 'uplink' && (
                <>
                  <div className="flex flex-wrap gap-x-2">
                    <span className="text-dim">&gt;&gt;</span>
                    <span className="text-muted">{UPLINK_TEXT}</span>
                    <span className="text-cyan">[ARMED]</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-bg3">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${boot.progress}%`,
                          background:
                            'linear-gradient(90deg, var(--cyan), var(--accent-sakura))',
                        }}
                      />
                    </div>
                    <span className="tabular-nums text-cyan">{boot.progress}%</span>
                  </div>
                </>
              )}
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={boot.skip}
                className="rounded-full border border-border px-4 py-2 font-mono text-[11px] tracking-[0.18em] text-dim uppercase transition-colors hover:border-cyan hover:text-cyan"
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
          <p aria-hidden className="font-mono text-lg tracking-[0.2em] text-fg sm:text-xl">
            {renderWordmark()}
          </p>
          <p className="mt-2 font-mono text-[11px] tracking-[0.24em] text-accent-sakura uppercase">
            {SUBHEAD}
          </p>

          <dl className="mt-6 grid gap-x-6 gap-y-1 font-mono text-[11px] sm:grid-cols-[10rem_1fr] sm:text-xs">
            {STATUS_ROWS.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-cyan">{k}</dt>
                <dd className="mb-2 text-muted sm:mb-0">{v}</dd>
              </div>
            ))}
          </dl>

          <hr className="hud-divider my-8" />

          <p className="hud-eyebrow">{ABOUT.kicker}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            {ABOUT.headline}
          </h1>
          <div className="mt-6 space-y-5">
            {ABOUT.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </div>
          <div className="mt-8">
            <a
              href={`mailto:${SITE.email}`}
              className="inline-flex items-center gap-2 rounded-full bg-cyan px-5 py-2.5 text-sm font-medium text-[#07090f] transition-transform hover:scale-[1.03]"
            >
              <MailIcon /> Say hello
            </a>
          </div>

          <hr className="hud-divider my-8" />

          <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] tracking-[0.14em] text-dim uppercase sm:text-[11px]">
            <span className="flex items-center gap-2">
              <span className="hud-dot hud-dot--green" />
              online
            </span>
            <button
              type="button"
              onClick={boot.replay}
              className="rounded-full border border-border px-3 py-1.5 tracking-[0.18em] uppercase transition-colors hover:border-cyan hover:text-cyan"
            >
              Replay boot
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
