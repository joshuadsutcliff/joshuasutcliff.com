import type { ReactNode } from 'react'

export type CliButtonSize = 'md' | 'sm'
export type CliButtonVariant = 'outline' | 'solid'

interface CliButtonCommonProps {
  children: ReactNode
  /** Outline is the bordered pill; solid is the cyan accent pill. */
  variant?: CliButtonVariant
  /** Only meaningful for the outline variant; solid carries fixed padding. */
  size?: CliButtonSize
  className?: string
  'aria-label'?: string
}

/* Discriminated on href: an href renders an anchor, its absence renders a
   button. `href?: never` on the button arm is what makes TypeScript reject
   passing both, and `onClick?: never` on the anchor arm keeps click handlers
   off links that should just navigate. */
type CliButtonAnchorProps = CliButtonCommonProps & {
  href: string
  onClick?: never
  /** Anchor target, e.g. "_blank" for external links. */
  target?: string
  /** Anchor rel. When target is "_blank" and rel is omitted, "noopener
      noreferrer" is applied automatically for security; an explicit rel
      always wins. */
  rel?: string
  /** Forwarded straight to the anchor's download attribute. */
  download?: boolean | string
}

type CliButtonButtonProps = CliButtonCommonProps & {
  href?: never
  onClick?: () => void
  target?: never
  rel?: never
  download?: never
}

export type CliButtonProps = CliButtonAnchorProps | CliButtonButtonProps

/* Exact class strings preserved from the stage 3 call sites. The two
   variants are not one base plus overrides: outline is an uppercase tracked
   micro-label with a hover color change, solid is a sentence-case accent pill
   with a hover scale. Composing one from the other would change what
   renders. */
const OUTLINE_BASE =
  'border-cli-dim/40 text-cli-dim hover:border-cli-cyan hover:text-cli-cyan font-cli inline-flex items-center gap-2 rounded-full border text-[11px] tracking-[0.18em] uppercase transition-colors'

const OUTLINE_SIZE: Record<CliButtonSize, string> = {
  md: 'px-4 py-2',
  sm: 'px-3 py-1.5',
}

const SOLID_BASE =
  'bg-cli-cyan text-cli-bg font-cli inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:scale-[1.03]'

/* Focus treatment is deliberately absent: the .cli-scope rules in
   src/index.css own the CLI focus ring for every anchor and button inside a
   scoped subtree, and CliPanel carries that scope. */
export default function CliButton(props: CliButtonProps) {
  const {
    children,
    variant = 'outline',
    size = 'md',
    className = '',
    'aria-label': ariaLabel,
  } = props

  const classes =
    variant === 'solid'
      ? `${SOLID_BASE} ${className}`.trim()
      : `${OUTLINE_BASE} ${OUTLINE_SIZE[size]} ${className}`.trim()

  if (props.href !== undefined) {
    // Security: an explicit target="_blank" without an opener/referrer
    // control lets the opened page reach back via window.opener. Default
    // rel to "noopener noreferrer" whenever the caller opens a new tab and
    // has not supplied their own rel; an explicit rel always wins.
    const rel = props.rel ?? (props.target === '_blank' ? 'noopener noreferrer' : undefined)

    return (
      <a
        href={props.href}
        target={props.target}
        rel={rel}
        download={props.download}
        aria-label={ariaLabel}
        className={classes}
      >
        {children}
      </a>
    )
  }

  return (
    <button type="button" onClick={props.onClick} aria-label={ariaLabel} className={classes}>
      {children}
    </button>
  )
}

export { CliButton }
