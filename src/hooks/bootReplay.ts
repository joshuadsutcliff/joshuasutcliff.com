import { createContext, useContext } from 'react'

/* Lets a page reach the ONE boot sequence that lives in the shell.

   Since stage 5b the boot is owned by Layout.tsx (through BootOverlay), not
   by any page, so the About page can no longer hold its own hook instance to
   drive its "Replay boot" control. This context carries just the replay
   callback down from the shell.

   The default is a no-op rather than a throw so a missing provider fails
   soft (a Replay click does nothing) instead of crashing the page. Today
   every consumer (AboutTerminal) always renders inside the shell, so this
   default is unreachable in practice; it exists purely as a guardrail
   against a future refactor rendering a consumer outside BootOverlay, which
   would otherwise make Replay silently do nothing with no signal at all.
   The dev-only warning below is that signal. */
export const BootReplayContext = createContext<() => void>(() => {
  if (import.meta.env.DEV) {
    console.warn(
      'useBootReplay() called with no BootReplayContext.Provider above it in the tree. ' +
        'Replay boot will do nothing. Render this component inside Layout/BootOverlay.',
    )
  }
})

export function useBootReplay(): () => void {
  return useContext(BootReplayContext)
}
