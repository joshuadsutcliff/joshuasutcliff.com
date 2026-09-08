import {
  CliSectionHeader,
  CliKeyValue,
  CliStatusDot,
  CliFooterStrip,
  CliPanel,
  CliButton,
  CliBootLog,
  CliCard,
  CliChip,
} from '../components/cli'
import type { LogLine } from '../components/cli'
import type { BootState } from '../hooks/useBootSequence'

// Static sample data for the boot log showcase. The style guide does not run
// the real boot clock: it renders a frozen mid-uplink frame so a reviewer can
// see every status colour and the progress bar at once.
const SAMPLE_LOG: LogLine[] = [
  { text: 'kernel handoff', status: 'ok' },
  { text: 'mount /skills', status: 'ok', note: 'sample note' },
  { text: 'deploy pipeline', status: 'active' },
  { text: 'metronome', status: 'armed' },
  { text: 'embouchure', status: 'warn', note: 'out of practice' },
  { text: 'coffee reserve', status: 'err', note: 'refill required' },
]

const SAMPLE_BOOT: BootState = {
  phase: 'uplink',
  visibleLines: SAMPLE_LOG.length,
  progress: 64,
  resolved: false,
  instant: true,
  skip: () => {},
  replay: () => {},
}

// Unlinked proof route for the stage 1 CLI token/component work. Not wired
// into Layout's TABS nav on purpose: this exists so a human and a reviewer
// can see the system at a glance before any real page consumes it.
export default function StyleGuide() {
  return (
    <div className="cli-scope bg-cli-bg min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <div>
          <CliSectionHeader as="h1">STYLE GUIDE</CliSectionHeader>
          <p className="cli-prose mt-2">
            Stage 1 proof route for the CLI design language. Tokens, typefaces, and primitives
            only, nothing here is wired into a live page yet.
          </p>
        </div>

        <section>
          <CliSectionHeader>TYPEFACES</CliSectionHeader>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="font-cli text-cli-cyan text-xs">font-cli / JetBrains Mono</p>
              <p className="font-cli text-cli-emphasis mt-1 text-lg">
                The quick brown fox jumps.
              </p>
              <p className="font-cli text-cli-text mt-1 text-sm">14px / 20px / 11px labels</p>
            </div>
            <div>
              <p className="font-cli text-cli-cyan text-xs">font-body / Geologica</p>
              <p className="cli-prose mt-1 text-lg">The quick brown fox jumps over the lazy dog.</p>
              <p className="cli-prose mt-1">16px / 1.6 line-height (25.6px computed)</p>
            </div>
          </div>
        </section>

        <section>
          <CliSectionHeader>PALETTE</CliSectionHeader>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { name: 'cli-bg', hex: '#121319' },
              { name: 'cli-text', hex: '#aac1cb' },
              { name: 'cli-cyan', hex: '#00ced1' },
              { name: 'cli-sakura', hex: '#e75480' },
              { name: 'cli-green', hex: '#4ade80' },
              { name: 'cli-emphasis', hex: '#ffffff' },
              { name: 'cli-warn', hex: '#f59e0b' },
            ].map((swatch) => (
              <div key={swatch.name} className="flex flex-col gap-2">
                <div
                  className="h-16 w-full rounded border border-white/10"
                  style={{ background: swatch.hex }}
                />
                <p className="font-cli text-cli-text text-xs">{swatch.name}</p>
                <p className="font-cli text-cli-dim text-xs">{swatch.hex}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <CliSectionHeader>KEY / VALUE</CliSectionHeader>
          <div className="mt-4">
            <CliKeyValue
              rows={[
                { key: 'host', value: 'joshuasutcliff.com' },
                { key: 'user', value: 'visitor' },
                { key: 'stage', value: '1 of N (tokens + primitives)' },
              ]}
            />
          </div>
        </section>

        <section>
          <CliSectionHeader>STATUS DOTS</CliSectionHeader>
          <div className="mt-4 flex flex-col gap-2">
            <CliStatusDot status="ok" label="build passing" />
            <CliStatusDot status="active" label="deploy in progress" />
            <CliStatusDot status="warn" label="pending review" />
          </div>
        </section>

        <section>
          <CliSectionHeader>FOOTER STRIP</CliSectionHeader>
          <div className="mt-4">
            <CliFooterStrip />
          </div>
        </section>

        <section>
          <CliSectionHeader>BUTTONS</CliSectionHeader>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <CliButton>Outline md</CliButton>
            <CliButton size="sm">Outline sm</CliButton>
            <CliButton variant="solid" href="#buttons">
              Solid anchor
            </CliButton>
          </div>
        </section>

        <section>
          <CliSectionHeader>BOOT LOG</CliSectionHeader>
          <div className="mt-4">
            <CliBootLog lines={SAMPLE_LOG} boot={SAMPLE_BOOT} />
          </div>
        </section>

        <section>
          <CliSectionHeader>PANEL</CliSectionHeader>
          {/* CliPanel brings its own section, max width, and page padding, so
              it deliberately breaks out of this page's column. That is the
              frame every CLI page uses. Since stage 5a it renders headerless
              by default: the site-wide shell in Layout.tsx owns the one
              persistent terminal header strip, which is why this route no
              longer showcases CliHeaderStrip standalone either. */}
          <CliPanel>
            <div className="px-4 py-8 sm:px-6">
              <p className="cli-prose">Page frame: section, bordered panel, header row.</p>
            </div>
          </CliPanel>
        </section>

        <section>
          <CliSectionHeader divider>CARDS</CliSectionHeader>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <CliCard>
              <p className="text-cli-text font-cli text-sm">Plain card</p>
              <p className="text-cli-dim mt-1 text-xs">Not navigable, just a bordered box.</p>
            </CliCard>
            <CliCard to="/about" aria-label="Go to about page">
              <p className="text-cli-text font-cli text-sm">Navigable card</p>
              <p className="text-cli-dim mt-1 text-xs">Whole card links to /about.</p>
            </CliCard>
          </div>
        </section>

        <section>
          <CliSectionHeader>CHIPS</CliSectionHeader>
          <div className="mt-4 flex flex-wrap gap-2">
            <CliChip>React</CliChip>
            <CliChip>TypeScript</CliChip>
            <CliChip>Tailwind</CliChip>
          </div>
        </section>
      </div>
    </div>
  )
}
