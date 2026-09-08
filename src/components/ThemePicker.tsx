import { useEffect, useRef, useState } from 'react'
import { DEFAULT_THEME_ID, THEMES, THEME_STORAGE_KEY, isThemeId, type ThemeId } from '../lib/themes'

/* Reads the theme id currently applied to document.documentElement (set
   either by the pre-paint inline script in index.html or by a prior
   selection this session), falling back to Default when the attribute is
   absent or holds an unknown value. Keeping this a pure read rather than
   React state seeded once means the picker never disagrees with what is
   actually on the root element. */
function readActiveThemeId(): ThemeId {
  if (typeof document === 'undefined') return DEFAULT_THEME_ID
  const current = document.documentElement.getAttribute('data-theme')
  return current && isThemeId(current) ? current : DEFAULT_THEME_ID
}

function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute('data-theme', id)
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    // Storage unavailable (private browsing, quota, etc). The swap already
    // happened on the live element; it just will not survive a reload.
  }
}

/* The theme picker: a palette-icon trigger button in the header that opens
   a listbox of the six registry themes. Selecting one swaps
   document.documentElement's data-theme attribute immediately (no
   transition, per the brief: the swap is instant, so there is nothing here
   that needs a reduced-motion branch) and persists the choice to
   localStorage under THEME_STORAGE_KEY, the same key the pre-paint script
   in index.html reads before first paint.

   Built as a real button plus a real listbox of real buttons rather than a
   native <select>, so it can carry the CLI visual language (thin borders,
   mono type, swatches) and the .cli-scope focus ring, which only applies to
   real focusable elements. */
export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<ThemeId>(readActiveThemeId)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Click-outside close.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  // On open, focus the option for the active theme, so arrow keys start
  // from a meaningful position instead of index 0. Focusing that option
  // fires its onFocus handler below, which is what actually updates
  // highlightIndex; this effect only moves DOM focus, it does not call
  // setState itself.
  useEffect(() => {
    if (!open) return
    const index = THEMES.findIndex((theme) => theme.id === activeId)
    const startIndex = index === -1 ? 0 : index
    optionRefs.current[startIndex]?.focus()
    // Only on open: activeId changing while open (via selection) closes the
    // menu anyway, so this does not need activeId as a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function closeAndReturnFocus() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function selectTheme(id: ThemeId) {
    applyTheme(id)
    setActiveId(id)
    closeAndReturnFocus()
  }

  function handleOptionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        const next = (index + 1) % THEMES.length
        setHighlightIndex(next)
        optionRefs.current[next]?.focus()
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        const next = (index - 1 + THEMES.length) % THEMES.length
        setHighlightIndex(next)
        optionRefs.current[next]?.focus()
        break
      }
      case 'Enter':
      case ' ':
        event.preventDefault()
        selectTheme(THEMES[index].id)
        break
      case 'Escape':
        event.preventDefault()
        closeAndReturnFocus()
        break
      case 'Tab':
        // Let focus leave normally, but close the menu so it does not sit
        // open over whatever gets focused next.
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Choose colour theme"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault()
            closeAndReturnFocus()
          }
        }}
        className="border-cli-dim/40 text-cli-dim hover:border-cli-cyan hover:text-cli-cyan grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
      >
        <PaletteIcon />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Colour theme"
          className="border-cli-dim/40 bg-cli-bg font-cli absolute right-0 z-20 mt-2 w-52 rounded-xl border p-1 text-xs shadow-lg"
        >
          {THEMES.map((theme, index) => {
            const isActive = theme.id === activeId
            return (
              <li key={theme.id} role="presentation">
                <button
                  ref={(el) => {
                    optionRefs.current[index] = el
                  }}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  tabIndex={highlightIndex === index ? 0 : -1}
                  onClick={() => selectTheme(theme.id)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  onFocus={() => setHighlightIndex(index)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    isActive ? 'text-cli-cyan' : 'text-cli-dim hover:text-cli-text'
                  }`}
                >
                  {/* Colour alone is not a sufficient marker for a low-vision
                      visitor, so the active theme also gets a non-colour
                      glyph, matching the ">" precedent used for the active
                      nav tab in Layout.tsx. aria-hidden keeps the glyph out
                      of the option's accessible name; aria-selected already
                      carries that state to assistive tech. */}
                  <span aria-hidden className="w-3 shrink-0">
                    {isActive ? '>' : ''}
                  </span>
                  <span
                    aria-hidden
                    className="border-cli-dim/30 flex h-4 w-4 shrink-0 overflow-hidden rounded-full border"
                  >
                    <span className="h-full w-1/3" style={{ backgroundColor: theme.bg }} />
                    <span className="h-full w-1/3" style={{ backgroundColor: theme.primary }} />
                    <span className="h-full w-1/3" style={{ backgroundColor: theme.secondary }} />
                  </span>
                  <span className="truncate">{theme.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PaletteIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 2-4 2 2 0 0 1 2-3h1a3 3 0 0 0 3-3c0-5.5-4.5-10-8-10z" />
      <circle cx="7" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="14" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="11" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export { ThemePicker }
