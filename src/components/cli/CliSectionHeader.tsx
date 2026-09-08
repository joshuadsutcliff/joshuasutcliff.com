import type { ReactNode } from 'react'

export interface CliSectionHeaderProps {
  children: ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4'
  className?: string
  /** When true, a decorative horizontal rule fills the remaining width
      beside the label. Defaults to false so existing call sites are
      unchanged. */
  divider?: boolean
  /** Optional shell-command prefix rendered ahead of the bracket glyphs,
      e.g. "cat stack". It is rendered with a "> " prompt and is purely
      decorative: like the brackets it is aria-hidden, so the heading's
      accessible name stays exactly the label text and a screen reader's
      heading list is not polluted with prompts. Omitted by default, so
      the treatment stays opt-in and every existing call site is
      unchanged. */
  command?: string
}

// Renders the "-[ SECTION NAME ]-" CLI heading treatment. A real semantic
// heading element sits behind the styling so the section name is announced
// normally by assistive tech; the decorative bracket glyphs are aria-hidden
// so a screen reader hears only the heading text.
export default function CliSectionHeader({
  children,
  as = 'h2',
  className = '',
  divider = false,
  command,
}: CliSectionHeaderProps) {
  const Heading = as
  const heading = (
    <Heading className={`font-cli text-cli-sakura flex flex-wrap items-center gap-1 tracking-wide ${className}`}>
      {command && (
        /* Cyan against the sakura label, matching the prompt/response
           colouring the rest of the CLI chrome already uses. Both colours
           come from the themed --cli-* token set via their Tailwind
           utilities, so the prefix tracks the active theme rather than
           pinning a hex.

           Rendered at full token opacity deliberately. An earlier pass had
           this at opacity-80 to make it recede, which measured 3.30:1 on
           Outer Space, 3.50:1 on Arctic, and 3.61:1 on Cherry Blossom:
           below AA, and invisible to check-contrast.mjs because that
           script validates the raw token values, not composited ones. The
           prefix recedes by type size alone instead. */
        <span aria-hidden className="text-cli-cyan mr-1 text-[11px]">
          &gt; {command}
        </span>
      )}
      <span aria-hidden>-[</span>
      <span>{children}</span>
      <span aria-hidden>]-</span>
    </Heading>
  )

  if (!divider) {
    return heading
  }

  return (
    <div className="flex items-center gap-3">
      {heading}
      <div aria-hidden className="border-cli-dim/30 flex-1 border-t" />
    </div>
  )
}

export { CliSectionHeader }
