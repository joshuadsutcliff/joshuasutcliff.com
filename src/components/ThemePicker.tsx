import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DEFAULT_THEME_ID, THEMES, THEME_STORAGE_KEY, isThemeId, type ThemeId } from '../lib/themes'

/* Reads the theme id currently applied to document.documentElement (set
   either by the pre-paint inline script in index.html or by a prior
   selection this session), falling back to Default when the attribute is
   absent or holds an unknown value. This is a pure read, not React state:
   the component re-runs it at the moments the picker actually needs to be
   accurate (initial render, menu open, and storage events from other tabs),
   rather than assuming the attribute never changes underneath it. */
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
   a menu of the six registry themes. Selecting one swaps
   document.documentElement's data-theme attribute immediately (no
   transition, per the brief: the swap is instant, so there is nothing here
   that needs a reduced-motion branch) and persists the choice to
   localStorage under THEME_STORAGE_KEY, the same key the pre-paint script
   in index.html reads before first paint.

   Built as a real button plus a real menu of real buttons rather than a
   native <select>, so it can carry the CLI visual language (thin borders,
   mono type, swatches) and the .cli-scope focus ring, which only applies to
   real focusable elements. The options are a mutually-exclusive set of
   choices with exactly one always "on", which is the ARIA menuitemradio
   group: unlike the listbox pattern, where the option role is inert and a
   single owner element moves a virtual focus cursor via
   aria-activedescendant, the menu pattern legitimately uses focusable items
   with roving tabindex, which is what this component actually does. */
export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<ThemeId>(readActiveThemeId)
  const [highlightIndex, setHighlightIndex] = useState(() => {
    const index = THEMES.findIndex((theme) => theme.id === activeId)
    return index === -1 ? 0 : index
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  // Set by the arrow-key-on-trigger handler below so the open effect knows
  // whether to land focus on the active option or the last one.
  const openFocusTargetRef = useRef<'active' | 'last' | null>(null)

  // Click-outside close. pointerdown covers touch and pen input directly
  // rather than relying on the browser synthesising a mousedown for them.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  // Cross-tab sync: another tab (or devtools, or future code) can change
  // data-theme without going through this component's own selectTheme, and
  // the only signal that reaches this tab for a localStorage write made
  // elsewhere is the storage event. Validate before applying so a garbage
  // or unrelated key write cannot desync the picker or the live page.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) return
      const value = event.newValue
      if (value && isThemeId(value)) {
        document.documentElement.setAttribute('data-theme', value)
        setActiveId(value)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // On open, re-read the live attribute (it may have drifted since mount
  // or since the last open) and focus the option for the active theme, so
  // arrow keys start from a meaningful position instead of index 0.
  // useLayoutEffect so this runs before paint: with a plain useEffect the
  // tabindex=0 row and the subsequent focus move could both be visible for
  // a frame on the first option before jumping to the active one.
  useLayoutEffect(() => {
    if (!open) return
    const current = readActiveThemeId()
    // This is a genuine resync, not a derived-state anti-pattern: `open`
    // becoming true is the external signal ("the user is looking now") that
    // the attribute needs re-reading, and the eslint rule's guidance to
    // move setState into an event handler does not apply because there is
    // no handler here, just the act of opening. Guarding on inequality
    // still avoids a redundant render in the common case where nothing
    // changed since the last open.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current !== activeId) setActiveId(current)
    const activeIndex = THEMES.findIndex((theme) => theme.id === current)
    const startIndex =
      openFocusTargetRef.current === 'last'
        ? THEMES.length - 1
        : activeIndex === -1
          ? 0
          : activeIndex
    openFocusTargetRef.current = null
    setHighlightIndex(startIndex)
    const target = optionRefs.current[startIndex]
    if (target) {
      target.focus()
    } else {
      // The ref array is populated by the option buttons' own ref callback
      // in the same render that made `open` true, so a missing ref here
      // means that wiring is broken, not that there is nothing to focus.
      // Failing loudly beats stranding the user on the trigger with an
      // open menu and no visible focus target.
      throw new Error(`ThemePicker: no option ref registered for index ${startIndex}`)
    }
    // Deliberately omits activeId: this effect only needs to run when the
    // menu opens (that is the moment it re-reads and resyncs activeId),
    // not every time activeId itself changes, which would be redundant
    // (selecting a theme already closes the menu) and would also refight
    // the focus placement this effect just performed.
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

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      closeAndReturnFocus()
      return
    }
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      openFocusTargetRef.current = event.key === 'ArrowUp' ? 'last' : 'active'
      setOpen(true)
    }
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
        // open over whatever gets focused next. Closing unmounts the
        // currently focused option, but React applies that DOM removal
        // synchronously inside this handler, before the browser resumes
        // its own Tab traversal, so the browser is choosing the next
        // tabbable element against a DOM that already lacks the option
        // rather than having it yanked out mid-traversal, which is the
        // situation that risks focus falling back to document.body.
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
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Choose colour theme"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={handleTriggerKeyDown}
        className="border-cli-dim/40 text-cli-dim hover:border-cli-cyan hover:text-cli-cyan grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
      >
        <PaletteIcon />
      </button>
      {open && (
        <ul
          role="menu"
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
                  role="menuitemradio"
                  aria-checked={isActive}
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
                      of the option's accessible name; aria-checked already
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

function PaletteIcon() {
  return (
    <svg
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
