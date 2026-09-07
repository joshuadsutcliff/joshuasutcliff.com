import {
  CliSectionHeader,
  CliKeyValue,
  CliStatusDot,
  CliHeaderStrip,
  CliFooterStrip,
} from '../components/cli'

// Unlinked proof route for the stage 1 CLI token/component work. Not wired
// into Layout's TABS nav on purpose: this exists so a human and a reviewer
// can see the system at a glance before any real page consumes it.
export default function StyleGuide() {
  return (
    <div className="cli-scope bg-cli-bg min-h-screen px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <CliHeaderStrip />

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
                <p className="font-cli text-cli-text/70 text-xs">{swatch.hex}</p>
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
      </div>
    </div>
  )
}
