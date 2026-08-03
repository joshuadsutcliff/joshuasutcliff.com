import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Footer from './Footer'
import { GithubIcon } from './icons'
import { SITE } from '../content/site'
import useSecretAdmin from '../hooks/useSecretAdmin'
import AccessFlourish from './AccessFlourish'
import ParticleField, { type ParticleMode } from './ParticleField'

const TABS = [
  { to: '/', label: 'Home' },
  { to: '/work', label: 'Work' },
  { to: '/projects', label: 'Projects' },
  { to: '/about', label: 'About' },
  { to: '/resume', label: 'Resume' },
]

function modeForPath(pathname: string): ParticleMode {
  if (pathname === '/') return 'constellation'
  if (pathname === '/work') return 'orbital'
  if (pathname === '/about') return 'nebula'
  if (pathname === '/resume') return 'singularity'
  return 'spiral'
}

export default function Layout() {
  const flourish = useSecretAdmin()
  const location = useLocation()
  const mode = modeForPath(location.pathname)
  return (
    <div className="min-h-screen text-fg">
      <div aria-hidden className="ambient-wash" />
      <div aria-hidden className="ambient-grid" />
      <ParticleField mode={mode} key={mode} />
      {flourish && <AccessFlourish />}
      <nav className="relative z-10 mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-3 px-6 py-6 print:hidden">
        <NavLink to="/" className="font-mono text-sm tracking-tight text-muted">
          js<span className="text-cyan">.</span>
        </NavLink>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 text-sm transition-colors ${
                  isActive ? 'glass text-fg' : 'text-muted hover:text-fg'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="glass grid h-10 w-10 place-items-center rounded-full text-fg transition-colors"
          >
            <GithubIcon />
          </a>
        </div>
      </nav>
      <hr className="hud-divider mx-auto max-w-5xl print:hidden" />
      <main className="page-enter" key={location.pathname}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
