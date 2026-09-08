import { MailIcon } from './icons'
import { SITE } from '../content/site'
import { ABOUT } from '../content/about'
import { useBootReplay } from '../hooks/bootReplay'
import { CliPanel, CliButton, CliKeyValue, CliFooterStrip } from './cli'

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

/* Operator status block. Real facts, so it stays in the accessibility tree. */
const STATUS_ROWS: Array<[string, string]> = [
  ['location', 'las cruces, new mexico'],
  ['role', 'contract it, systems and networking'],
  ['since', '2017'],
  ['instrument', 'trumpet'],
  ['status', 'open to a good problem'],
]

/* Stage 5b: this page no longer owns a boot sequence. The boot moved to the
   shell (Layout.tsx via BootOverlay.tsx) where it plays once per session on
   first arrival at ANY route, and the boot log copy moved with it, verbatim.
   What remains here is the "Replay boot" control, which now reaches the
   shell's single boot through BootReplayContext. That replay re-runs the
   overlay for the current view WITHOUT clearing the site-wide 'cli-booted'
   session flag, so it cannot re-arm the boot for later navigations. */
export default function AboutTerminal() {
  const replayBoot = useBootReplay()

  return (
    <CliPanel>
      {/* wordmark-glow (src/index.css) is the resolved-decision treatment:
          a restrained static text-shadow bloom in the active accent, built
          from --cli-cyan-rgb so it tracks the theme. No animation, no
          flicker, no CRT/pixel effect; see the CSS comment for why nothing
          here needs a reduced-motion branch. */}
      <p
        aria-hidden
        className="font-cli text-cli-emphasis wordmark-glow text-lg tracking-[0.2em] sm:text-xl"
      >
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
        <CliButton size="sm" onClick={replayBoot}>
          Replay boot
        </CliButton>
      </div>
    </CliPanel>
  )
}
