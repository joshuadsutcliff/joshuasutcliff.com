import { useCallback, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

function readTheme(): Theme {
  const m = document.cookie.match(/(?:^|; )theme=(\w+)/)
  if (m && (m[1] === 'dark' || m[1] === 'light')) return m[1]
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'dark'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document === 'undefined' ? 'dark' : readTheme(),
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    // 1 year persistence
    document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}
