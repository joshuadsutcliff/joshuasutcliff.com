import { NavLink, Outlet } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import Footer from './Footer'
import { GithubIcon } from './icons'
import { SITE } from '../content/site'

const TABS = [
  { to: '/', label: 'Home' },
  { to: '/work', label: 'Work' },
  { to: '/projects', label: 'Projects' },
  { to: '/about', label: 'About' },
  { to: '/resume', label: 'Resume' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-bg text-fg">
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
          <ThemeToggle />
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
