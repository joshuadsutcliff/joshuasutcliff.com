import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Footer from './Footer'
import { GithubIcon } from './icons'
import { SITE } from '../content/site'
import useSecretAdmin from '../hooks/useSecretAdmin'
import AccessFlourish from './AccessFlourish'
import { prefersReducedMotion } from '../lib/motion'
import { isCliFrameEnabled } from '../lib/cliFlag'
import CliStatusStrip from './CliStatusStrip'

const TABS = [
  { to: '/', label: 'Home' },
  { to: '/work', label: 'Work' },
  { to: '/projects', label: 'Projects' },
  { to: '/about', label: 'About' },
  { to: '/resume', label: 'Resume' },
]

export default function Layout() {
  const flourish = useSecretAdmin()
  const location = useLocation()
  const useViewTransition = !prefersReducedMotion()
  const cliFrame = isCliFrameEnabled()
  return (
    <div className="min-h-screen text-fg">
      <div aria-hidden className="ambient-wash" />
      <div aria-hidden className="ambient-grid" />
      {flourish && <AccessFlourish />}
      {cliFrame && <CliStatusStrip pathname={location.pathname} />}
      <nav className="relative z-10 mx-auto flex max-w-5xl flex-nowrap items-center justify-between gap-x-0.5 px-2 py-6 sm:gap-x-1 sm:gap-y-3 sm:px-6 print:hidden">
        <NavLink
          to="/"
          viewTransition={useViewTransition}
          className="inline-flex min-h-11 shrink-0 items-center font-mono text-sm tracking-tight text-muted"
        >
          js<span className="text-cyan">.</span>
        </NavLink>
        <div className="flex min-w-0 flex-nowrap items-center gap-0 sm:flex-wrap sm:gap-2">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              viewTransition={useViewTransition}
              className={({ isActive }) =>
                `inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-1 py-3 text-[11px] transition-colors sm:px-3.5 sm:text-sm ${
                  isActive ? 'glass text-fg' : 'text-muted hover:text-fg'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="glass grid h-9 w-9 place-items-center rounded-full text-fg transition-colors sm:h-11 sm:w-11"
          >
            <GithubIcon />
          </a>
        </div>
      </nav>
      <hr className="hud-divider mx-auto max-w-5xl print:hidden" />
      <main className="relative page-enter" key={location.pathname}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
