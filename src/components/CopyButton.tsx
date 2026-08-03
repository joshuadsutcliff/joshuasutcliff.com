import { useState } from 'react'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard write failed silently; the button simply won't flip to COPIED.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-3 top-3 rounded-md border border-border bg-bg2 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-cyan shadow-[0_0_0_6px_#0b0e16] transition-colors hover:text-purple"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
