import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// Secret /admin entry. Two gestures, both handled at document level:
// 1. Select the site owner's name anywhere, press Enter.
// 2. Tap/click the element marked [data-secret-admin] 5 times, each tap
//    within 3s of the previous.
// Security lives in the server-side password gate; this is a doorway, not a lock.

const NAMES = ['sutcliff', 'joshua sutcliff']
const TAPS_REQUIRED = 5
const TAP_WINDOW_MS = 3000
const FLOURISH_MS = 700

export default function useSecretAdmin(): boolean {
  const [flourish, setFlourish] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const taps = useRef({ count: 0, last: 0 })
  const busy = useRef(false)

  const trigger = useCallback(() => {
    if (busy.current || pathname === '/admin') return
    busy.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      busy.current = false
      navigate('/admin')
      return
    }
    setFlourish(true)
    window.setTimeout(() => {
      setFlourish(false)
      busy.current = false
      navigate('/admin')
    }, FLOURISH_MS)
  }, [navigate, pathname])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const sel = window.getSelection()?.toString().trim().toLowerCase() ?? ''
      if (NAMES.includes(sel)) trigger()
    }
    function onClick(e: MouseEvent) {
      const el = e.target instanceof Element ? e.target.closest('[data-secret-admin]') : null
      if (!el) return
      const now = Date.now()
      const t = taps.current
      t.count = now - t.last <= TAP_WINDOW_MS ? t.count + 1 : 1
      t.last = now
      if (t.count >= TAPS_REQUIRED) {
        t.count = 0
        trigger()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick)
    }
  }, [trigger])

  return flourish
}
