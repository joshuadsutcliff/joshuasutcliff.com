import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Footer from './Footer'
import { GithubIcon } from './icons'
import { SITE } from '../content/site'
import useSecretAdmin from '../hooks/useSecretAdmin'
import AccessFlourish from './AccessFlourish'
import { prefersReducedMotion } from '../lib/motion'
import BootOverlay from './BootOverlay'
import { CliHeaderStrip } from './cli'
import ThemePicker from './ThemePicker'

/* cmd is the decorative terminal-command string shown in the hover/focus
   tooltip (see .nav-cmd-tooltip in src/index.css). It is never part of the
   link's accessible name: the span that renders it stays aria-hidden, the
   same treatment the active-tab marker glyph below already gets. */
const TABS = [
  { to: '/', label: 'home', cmd: '> cd ~' },
  { to: '/work', label: 'work', cmd: '> cat /var/log/work.log // history' },
  { to: '/projects', label: 'projects', cmd: '> ls -la /projects/' },
  { to: '/about', label: 'about', cmd: '> ssh visitor@joshuasutcliff.com' },
  { to: '/resume', label: 'resume', cmd: '> cat resume.pdf' },
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
   converted) inherits the CLI focus ring described in src/index.css.

   Boot ownership (stage 5b): the once-per-session boot is mounted here, as
   the first child of the cli-scope root and OUTSIDE the <main> that is keyed
   on location.pathname. The shell itself never remounts on navigation, so
   the boot plays once and the per-route <main> remount underneath it cannot
   restart or flash it. Being inside cli-scope is also what gives the boot's
   Skip button the shared CLI focus ring. */
export default function Layout() {
  const flourish = useSecretAdmin()
  const location = useLocation()
  const useViewTransition = !prefersReducedMotion()
  return (
    <div className="cli-scope bg-cli-bg text-cli-text min-h-screen">
      <BootOverlay pathname={location.pathname}>
        {flourish && <AccessFlourish />}
        <header className="border-cli-dim/30 relative z-10 border-b print:hidden">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            {/* Decorative terminal chrome only: LIVE indicator, session hex,
                ssh line. Kept aria-hidden, and hidden from print by the
                .cli-header-strip-row rule in src/index.css. */}
            <div aria-hidden className="cli-header-strip-row py-2.5">
              <CliHeaderStrip pathname={location.pathname} />
            </div>
            <nav
              aria-label="Primary"
              className="border-cli-dim/20 flex flex-nowrap items-center justify-between gap-x-2 border-t py-2"
            >
              <ul className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 sm:flex-nowrap sm:gap-x-2">
                {TABS.map((t, i) => {
                  /* The tooltip anchors to its own tab's edge instead of
                     always centering, so it never pushes past the nav's
                     left/right bound on a narrow viewport. See the
                     data-align styling in src/index.css. */
                  const align = i === 0 ? 'start' : i === TABS.length - 1 ? 'end' : 'center'
                  return (
                    <li key={t.to} className="nav-item">
                      <NavLink
                        to={t.to}
                        end={t.to === '/'}
                        viewTransition={useViewTransition}
                        className={({ isActive }) =>
                          `nav-pill font-cli inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2 py-2 text-[11px] tracking-[0.14em] uppercase transition-colors sm:px-3 sm:text-xs ${
                            isActive
                              ? 'text-cli-cyan border-cli-cyan/60 border-b'
                              : 'text-cli-dim hover:text-cli-text border-b border-transparent'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Colour is a weak affordance on its own for a
                                low-vision user, so the active tab also gets a
                                non-colour marker glyph. aria-hidden keeps it out
                                of the link's accessible name; the visible label
                                text is unchanged either way. */}
                            {isActive && <span aria-hidden>&gt;</span>}
                            <span aria-hidden>/</span>
                            {t.label}
                          </>
                        )}
                      </NavLink>
                      {/* Decorative command bubble: aria-hidden keeps it out
                          of the link's accessible name (same rationale as the
                          marker glyph above), and it is positioned absolute
                          so its appearance/disappearance never shifts layout. */}
                      <span aria-hidden data-align={align} className="nav-cmd-tooltip">
                        {t.cmd}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="flex shrink-0 items-center gap-2">
                {/* Sits next to the GitHub icon link: both are the header's
                    row of small circular icon affordances, so the picker
                    trigger reads as one more item in that same row rather
                    than a bolted-on control elsewhere in the shell. */}
                <ThemePicker />
                <a
                  href={SITE.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="border-cli-dim/40 text-cli-dim hover:border-cli-cyan hover:text-cli-cyan grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
                >
                  <GithubIcon />
                </a>
              </div>
            </nav>
          </div>
        </header>
        <main className="page-enter relative" key={location.pathname}>
          <Outlet />
        </main>
        <Footer />
      </BootOverlay>
    </div>
  )
}
