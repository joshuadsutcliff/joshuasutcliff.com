import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Scrolls to the top of the page on PUSH/REPLACE navigations (clicking a link),
// while leaving POP navigations (browser back/forward) to the browser's own
// scroll restoration. Skips the scroll when the URL has a hash so anchor
// links keep working.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType === 'POP') return
    if (hash) return
    window.scrollTo(0, 0)
  }, [pathname, hash, navigationType])

  return null
}
