import { MailIcon } from './icons'
import { SITE } from '../content/site'
import { ABOUT } from '../content/about'
import useBootSequence, { RESOLVE_FADE_MS } from '../hooks/useBootSequence'
import { CliPanel, CliButton, CliBootLog, CliKeyValue, CliFooterStrip, CLI_CONTENT_PADDING } from './cli'
import type { LogLine } from './cli'

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
  const showBoot = !boot.resolved

  return (
    <CliPanel padded={false}>
      {showBoot && (
        <div className="px-4 py-6 sm:px-6">
          <CliBootLog lines={LOG} boot={boot} />
          <div className="mt-5">
            <CliButton onClick={boot.skip}>Skip</CliButton>
          </div>
        </div>
      )}

      {/* Real content. Always in the DOM and in the accessibility tree from
          the first frame. The boot sequence only fades it in visually. */}
      <div
        className={`${CLI_CONTENT_PADDING} ${showBoot ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        style={{ transition: `opacity ${RESOLVE_FADE_MS}ms ease` }}
      >
        <p aria-hidden className="font-cli text-cli-emphasis text-lg tracking-[0.2em] sm:text-xl">
          {renderWordmark()}
        </p>
        <p
          aria-hidden
          className="font-cli text-cli-sakura mt-2 text-[11px] tracking-[0.24em] uppercase"
        >
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
          <CliButton variant="solid" href={`mailto:${SITE.email}`}>
            <MailIcon className="h-4 w-4" /> Say hello
          </CliButton>
        </div>

        <hr className="border-cli-dim/30 my-8" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <CliFooterStrip status="online" dotStatus="ok" />
          <CliButton size="sm" onClick={boot.replay}>
            Replay boot
          </CliButton>
        </div>
      </div>
    </CliPanel>
  )
}
