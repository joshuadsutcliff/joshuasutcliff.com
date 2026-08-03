import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { OBSIDIAN_CLAUDE_GUIDE, type GuideBlock, type GuideInline } from '../content/guides'
import CopyButton from '../components/CopyButton'

function RenderInline({ inline }: { inline: GuideInline[] }) {
  return (
    <>
      {inline.map((piece, i) => {
        switch (piece.kind) {
          case 'bold':
            return (
              <strong key={i} className="font-semibold text-fg">
                {piece.text}
              </strong>
            )
          case 'code':
            return (
              <code
                key={i}
                className="rounded-md border border-border bg-bg2 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan"
              >
                {piece.text}
              </code>
            )
          case 'link':
            return piece.href.startsWith('/') ? (
              <Link key={i} to={piece.href} className="text-cyan underline underline-offset-2 hover:text-purple">
                {piece.text}
              </Link>
            ) : (
              <a
                key={i}
                href={piece.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan underline underline-offset-2 hover:text-purple"
              >
                {piece.text}
              </a>
            )
          default:
            return <span key={i}>{piece.text}</span>
        }
      })}
    </>
  )
}

function RenderBlock({ block, index }: { block: GuideBlock; index: number }) {
  switch (block.kind) {
    case 'heading2':
      return (
        <h2 key={index} className="mt-10 font-display text-2xl font-semibold tracking-tight text-fg">
          {block.text}
        </h2>
      )
    case 'heading3':
      return (
        <h3 key={index} className="mt-6 font-display text-lg font-semibold tracking-tight text-fg">
          {block.text}
        </h3>
      )
    case 'paragraph':
      return (
        <p key={index} className="mt-4 leading-relaxed text-muted">
          <RenderInline inline={block.inline} />
        </p>
      )
    case 'list':
      return (
        <ul key={index} className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-muted">
          {block.items.map((item, i) => (
            <li key={i}>
              <RenderInline inline={item} />
            </li>
          ))}
        </ul>
      )
    case 'code':
      return (
        <div key={index} className="relative mt-4">
          <pre className="whitespace-pre-wrap [overflow-wrap:anywhere] rounded-xl border border-border bg-bg2 p-4 pr-20 text-xs leading-relaxed text-fg">
            <code className="font-mono">{block.text}</code>
          </pre>
          <CopyButton text={block.text} />
        </div>
      )
    case 'divider':
      return <hr key={index} className="mt-10 border-border" />
    default:
      return null
  }
}

export default function GuideObsidianClaude() {
  useEffect(() => {
    const previous = document.title
    document.title = `${OBSIDIAN_CLAUDE_GUIDE.title} - Joshua Sutcliff`
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <p className="hud-eyebrow">Guide</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
        {OBSIDIAN_CLAUDE_GUIDE.title}
      </h1>
      <p className="mt-6 leading-relaxed text-muted">{OBSIDIAN_CLAUDE_GUIDE.intro}</p>
      <p className="mt-4 leading-relaxed text-muted">
        <RenderInline inline={OBSIDIAN_CLAUDE_GUIDE.why} />
      </p>
      <div className="hud-panel mt-6 rounded-2xl p-5 text-sm leading-relaxed text-muted">
        <RenderInline inline={OBSIDIAN_CLAUDE_GUIDE.preImportNote} />
      </div>

      <div className="hud-panel mt-10 rounded-3xl p-8 sm:p-12">
        {OBSIDIAN_CLAUDE_GUIDE.blocks.map((block, i) => (
          <RenderBlock key={i} block={block} index={i} />
        ))}
      </div>
    </section>
  )
}
