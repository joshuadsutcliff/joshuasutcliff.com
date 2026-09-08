import { createContext, useContext } from 'react'

/* Lets a page reach the ONE boot sequence that lives in the shell.

   Since stage 5b the boot is owned by Layout.tsx (through BootOverlay), not
   by any page, so the About page can no longer hold its own hook instance to
   drive its "Replay boot" control. This context carries just the replay
   callback down from the shell. Reading it outside the shell (the style
   guide renders CLI primitives standalone) yields a no-op rather than
   throwing, so a primitive is never coupled to the provider. */
export const BootReplayContext = createContext<() => void>(() => {})

export function useBootReplay(): () => void {
  return useContext(BootReplayContext)
}
