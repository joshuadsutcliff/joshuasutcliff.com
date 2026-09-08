import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { OBSIDIAN_CLAUDE_GUIDE, type GuideBlock, type GuideInline } from '../content/guides'
import CopyButton from '../components/CopyButton'
import { CliPanel, CliCard, CliSectionHeader } from '../components/cli'

function RenderInline({ inline }: { inline: GuideInline[] }) {
  return (
    <>
      {inline.map((piece, i) => {
        switch (piece.kind) {
          case 'bold':
            return (
              <strong key={i} className="text-cli-emphasis font-semibold">
                {piece.text}
              </strong>
            )
          case 'code':
            return (
              <code
                key={i}
                className="border-cli-dim/30 bg-cli-bg text-cli-cyan font-cli rounded-md border px-1.5 py-0.5 text-[0.85em]"
              >
                {piece.text}
              </code>
            )
          case 'link':
            return piece.href.startsWith('/') ? (
              <Link
                key={i}
                to={piece.href}
                className="text-cli-cyan hover:text-cli-sakura underline underline-offset-2"
              >
                {piece.text}
              </Link>
            ) : (
              <a
                key={i}
                href={piece.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cli-cyan hover:text-cli-sakura underline underline-offset-2"
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
        <CliSectionHeader key={index} as="h2" divider className="mt-10">
          {block.text}
        </CliSectionHeader>
      )
    case 'heading3':
      return (
        <h3 key={index} className="font-cli text-cli-emphasis mt-6 text-lg tracking-tight">
          <span aria-hidden className="text-cli-dim">{'> '}</span>
          {block.text}
        </h3>
      )
    case 'paragraph':
      return (
        <p key={index} className="cli-prose text-cli-text mt-4">
          <RenderInline inline={block.inline} />
        </p>
      )
    case 'list':
      return (
        <ul key={index} className="cli-prose text-cli-text mt-4 list-disc space-y-2 pl-5">
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
          <pre className="border-cli-dim/30 bg-cli-bg text-cli-text whitespace-pre-wrap [overflow-wrap:anywhere] rounded-xl border p-4 pr-20 text-xs leading-relaxed">
            <code className="font-cli">{block.text}</code>
          </pre>
          <CopyButton text={block.text} />
        </div>
      )
    case 'divider':
      return <hr key={index} className="border-cli-dim/30 mt-10" />
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
    <CliPanel width="narrow">
      <p className="font-cli text-cli-dim text-[11px] uppercase tracking-[0.14em]">Guide</p>
      <h1 className="font-cli text-cli-emphasis mt-3 text-3xl tracking-tight sm:text-4xl">
        {OBSIDIAN_CLAUDE_GUIDE.title}
      </h1>
      <p className="cli-prose text-cli-text mt-6">{OBSIDIAN_CLAUDE_GUIDE.intro}</p>
      <p className="cli-prose text-cli-text mt-4">
        <RenderInline inline={OBSIDIAN_CLAUDE_GUIDE.why} />
      </p>
      <CliCard className="mt-6">
        <p className="cli-prose text-cli-text text-sm">
          <RenderInline inline={OBSIDIAN_CLAUDE_GUIDE.preImportNote} />
        </p>
      </CliCard>

      <CliCard padding="lg" className="mt-10">
        {OBSIDIAN_CLAUDE_GUIDE.blocks.map((block, i) => (
          <RenderBlock key={i} block={block} index={i} />
        ))}
      </CliCard>
    </CliPanel>
  )
}
