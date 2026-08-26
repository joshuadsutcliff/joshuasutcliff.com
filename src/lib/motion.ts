/**
 * Shared, side-effect-free motion preference check. Reads
 * `prefers-reduced-motion` once per call via matchMedia; callers that need
 * the value at a specific moment (mount, click handler) call this directly
 * rather than subscribing to changes, since a mid-session change is rare
 * and not worth the extra listener plumbing here.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
