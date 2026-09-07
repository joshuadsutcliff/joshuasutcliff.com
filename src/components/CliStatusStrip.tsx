type Props = { pathname: string }

// Terminal-style route indicator that sits above the nav. Hidden below
// the `sm` breakpoint on purpose: the header is a single tight row at
// 320px and nothing new may compete for that space.
export default function CliStatusStrip({ pathname }: Props) {
  const route = pathname === '/' ? '~' : `~${pathname}`
  return (
    <div className="relative z-10 mx-auto hidden max-w-5xl items-center justify-between px-6 pt-4 font-mono text-[11px] sm:flex print:hidden">
      <span className="flex items-center gap-1.5">
        {/* Sakura pink is deliberately used exactly once per page, here.
            The footer prompt stays cyan (the structural hue); do not
            change this to cyan or add sakura elsewhere. */}
        <span aria-hidden className="text-accent-sakura">
          &#10095;
        </span>
        <span className="text-dim">
          js@joshuasutcliff<span aria-hidden>:</span>
          <span className="text-cyan">{route}</span>
        </span>
      </span>
      <span className="flex items-center gap-2 text-dim">
        <span aria-hidden className="hud-dot hud-dot--green" />
        online
      </span>
    </div>
  )
}
