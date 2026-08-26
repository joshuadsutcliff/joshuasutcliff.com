import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'

const REVEAL_STEP_MS = 60
const REVEAL_MAX_DELAY_MS = 300

/**
 * Attach the returned ref to a container element. On mount it finds every
 * `[data-reveal]` descendant, arms it (adds `is-armed`, which is the ONLY
 * place the hidden state is applied - never in the stylesheet, so content
 * stays fully visible if JS never runs or IntersectionObserver is
 * unsupported), assigns a staggered `--reveal-delay` custom property capped
 * at ~300ms, then observes each element. The first time an element enters
 * the viewport it gets `is-revealed` and is unobserved (one shot, never
 * re-hidden on scroll back). Elements already on screen at mount reveal
 * immediately, since the observer's initial callback fires for anything
 * already intersecting.
 *
 * Usage:
 *   const containerRef = useReveal<HTMLDivElement>()
 *   <div ref={containerRef}>
 *     <Card data-reveal />
 *     <Card data-reveal />
 *   </div>
 */
export default function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return
    if (prefersReducedMotion()) return

    const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (elements.length === 0) return

    elements.forEach((el, index) => {
      const delay = Math.min(index * REVEAL_STEP_MS, REVEAL_MAX_DELAY_MS)
      el.style.setProperty('--reveal-delay', `${delay}ms`)
      el.classList.add('is-armed')
    })

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -10% 0px' },
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return ref
}
