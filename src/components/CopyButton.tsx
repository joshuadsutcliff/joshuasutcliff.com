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
      className="border-cli-dim/40 bg-cli-bg text-cli-cyan hover:text-cli-sakura font-cli absolute right-3 top-3 rounded-md border px-2 py-1 text-[10px] uppercase tracking-wide transition-colors"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
