import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Footer from './Footer'
import { GithubIcon } from './icons'
import { SITE } from '../content/site'
import useSecretAdmin from '../hooks/useSecretAdmin'
import AccessFlourish from './AccessFlourish'
import { prefersReducedMotion } from '../lib/motion'
import { CliHeaderStrip } from './cli'

const TABS = [
  { to: '/', label: 'home' },
  { to: '/work', label: 'work' },
  { to: '/projects', label: 'projects' },
  { to: '/about', label: 'about' },
  { to: '/resume', label: 'resume' },
]

/* The site-wide CLI shell (stage 5a).

   Header ownership: this shell mounts the ONE persistent CliHeaderStrip for
   the whole site. CliPanel's showHeader therefore defaults to false, so a
   page never renders a second strip.

   Accessibility structure: CliHeaderStrip is decorative chrome and stays
   aria-hidden. Navigation is real content, so it is a SIBLING of the
   decorative row inside the header, never a child of it, and lives in its own
   <nav> landmark. Nothing interactive is inside an aria-hidden subtree.

   cli-scope lives on the root here so every page (including the pages not yet
   converted) inherits the CLI focus ring described in src/index.css. */
export default function Layout() {
  const flourish = useSecretAdmin()
  const location = useLocation()
  const useViewTransition = !prefersReducedMotion()
  return (
    <div className="cli-scope bg-cli-bg text-cli-text min-h-screen">
      <div aria-hidden className="ambient-wash" />
      <div aria-hidden className="ambient-grid" />
      {flourish && <AccessFlourish />}
      <header className="border-cli-dim/30 relative z-10 border-b print:hidden">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Decorative terminal chrome only: LIVE indicator, session hex,
              ssh line. Kept aria-hidden, and hidden from print by the
              .cli-header-strip-row rule in src/index.css. */}
          <div aria-hidden className="cli-header-strip-row py-2.5">
            <CliHeaderStrip />
          </div>
          <nav
            aria-label="Primary"
            className="border-cli-dim/20 flex flex-nowrap items-center justify-between gap-x-2 border-t py-2"
          >
            <ul className="flex min-w-0 flex-nowrap items-center gap-x-1 sm:gap-x-2">
              {TABS.map((t) => (
                <li key={t.to}>
                  <NavLink
                    to={t.to}
                    end={t.to === '/'}
                    viewTransition={useViewTransition}
                    className={({ isActive }) =>
                      `font-cli inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2 py-2 text-[11px] tracking-[0.14em] uppercase transition-colors sm:px-3 sm:text-xs ${
                        isActive
                          ? 'text-cli-cyan border-cli-cyan/60 border-b'
                          : 'text-cli-dim hover:text-cli-text border-b border-transparent'
                      }`
                    }
                  >
                    <span aria-hidden>/</span>
                    {t.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <a
              href={SITE.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="border-cli-dim/40 text-cli-dim hover:border-cli-cyan hover:text-cli-cyan grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
            >
              <GithubIcon />
            </a>
          </nav>
        </div>
      </header>
      <main className="page-enter relative" key={location.pathname}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
