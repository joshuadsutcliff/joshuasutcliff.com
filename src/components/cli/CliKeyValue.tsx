import { Fragment, type ReactNode } from 'react'

export interface CliKeyValueRow {
  key: string
  value: ReactNode
}

export interface CliKeyValueProps {
  rows: CliKeyValueRow[]
  className?: string
}

// Key-value block rendered as a real definition list so the key-value
// relationship is exposed to assistive tech, with CLI monospace styling
// layered on top. The leading marker glyph is decorative and aria-hidden.
export default function CliKeyValue({ rows, className = '' }: CliKeyValueProps) {
  return (
    <dl className={`font-cli grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm ${className}`}>
      {rows.map((row, index) => (
        <Fragment key={`${row.key}-${index}`}>
          <dt className="text-cli-cyan flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden>&#9654;</span>
            {row.key}
          </dt>
          <dd className="text-cli-text m-0">{row.value}</dd>
        </Fragment>
      ))}
    </dl>
  )
}

export { CliKeyValue }
