# joshuasutcliff.com Remodel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-page Compound AI explainer into a five-page identity-led personal site (Home, Work, Projects, About, Resume) and migrate public brass458 repos to joshuadsutcliff.

**Architecture:** `react-router-dom` real routes under a shared `Layout` (nav tabs + footer). All copy lives in typed modules under `src/content/`, one per page; components render content and contain no prose. Visual system (tokens, glass, particles, theme toggle) is reused unchanged.

**Tech Stack:** Vite + React 19 + TypeScript + Tailwind v4 on Vercel. Only new dependency: `react-router-dom`.

## Global Constraints

- **No em dash (U+2014) in any file.** The repo pre-commit hook (`.githooks/pre-commit`) blocks them. Use commas, colons, semicolons, periods, hyphens.
- **No `brass458`** anywhere in the repo.
- **Public-safe copy:** no client/employer names (especially the string `HKDA`), no hostnames/IPs, none of: seedbox, torrent, nyaa, IPTorrents, qBittorrent.
- **Verification cycle instead of unit tests:** this is a static content site with no test runner; each task's cycle is `npm run build` (typecheck + Vite) plus exact `grep` checks and, where noted, `npm run preview` route checks. Do not add a test framework.
- Commit after every task; commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Repo root: `/Users/josh/Github/joshuasutcliff.com`. Use `git -C` forms, never `cd X && git`.

---

### Task 1: Router scaffold, shared content, Layout with nav + footer

**Files:**
- Create: `src/content/site.ts`
- Create: `src/components/icons.tsx`
- Create: `src/components/Layout.tsx`
- Create: `src/pages/Home.tsx`, `src/pages/Work.tsx`, `src/pages/Projects.tsx`, `src/pages/About.tsx`, `src/pages/Resume.tsx` (stubs, replaced by Tasks 2-6)
- Modify: `src/main.tsx`
- Modify: `src/App.tsx` (full rewrite)
- Modify: `src/components/Footer.tsx` (full rewrite)

**Interfaces:**
- Produces: `SITE` (from `src/content/site.ts`) with fields `name, oneLiner, location, email, github, githubHandle, tagline, attribution: {text, caosSite, caosRepo, caosAuthor}`. `GithubIcon({className?})` and `MailIcon({className?})` from `src/components/icons.tsx`. `Layout` renders `<Outlet />`. Later page tasks rely on these exact names.

- [ ] **Step 1: Install react-router-dom**

Run: `cd /Users/josh/Github/joshuasutcliff.com && npm install react-router-dom`
Expected: added to `dependencies` in `package.json`, no errors.

- [ ] **Step 2: Create `src/content/site.ts`**

```ts
// Shared site identity. All copy is PUBLIC-SAFE: no client or employer names,
// no hostnames or IPs, no private infrastructure details.

export const SITE = {
  name: 'Joshua Sutcliff',
  oneLiner: 'Husband, musician, and systems administrator.',
  location: 'Las Cruces, New Mexico',
  email: 'joshua.d.sutcliff@gmail.com',
  github: 'https://github.com/joshuadsutcliff',
  githubHandle: 'joshuadsutcliff',
  tagline: 'The public face of a private R&D habit.',
  attribution: {
    text: 'Compound AI: Enforced Runtime builds on the Compound AI Operating Standards, a portable, vendor-neutral operating doctrine by Cameron Sutcliff. Doctrine, goal-contract structure, integrity tooling, and the cognitive-skills toolkit derive from CAOS, used under CC BY 4.0.',
    caosSite: 'https://cameronsutcliff.com/compound-ai',
    caosRepo: 'https://github.com/cameronpsutcliff/compound-ai-operating-standards',
    caosAuthor: 'Cameron Sutcliff',
  },
}
```

- [ ] **Step 3: Create `src/components/icons.tsx`**

Move `GithubIcon` out of `Hero.tsx` (same SVG path) and add `MailIcon`:

```tsx
export function GithubIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.93c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.75.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.42.37.8 1.1.8 2.22v3.29c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  )
}

export function MailIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  )
}
```

- [ ] **Step 4: Create `src/components/Layout.tsx`**

```tsx
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
```

- [ ] **Step 5: Rewrite `src/components/Footer.tsx`**

Same structure as the current footer, with three changes: import `SITE` from `../content/site` (attribution now lives at `SITE.attribution`), replace the subtagline line with `SITE.oneLiner`, and add an email link next to the GitHub link:

```tsx
import { SITE } from '../content/site'

export default function Footer() {
  return (
    <footer className="relative mt-8 border-t border-border print:hidden">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-fg">{SITE.name}</p>
            <p className="mt-1 text-sm text-muted">{SITE.oneLiner}</p>
            <div className="mt-3 flex flex-col gap-1 font-mono text-xs">
              <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">
                github.com/{SITE.githubHandle}
              </a>
              <a href={`mailto:${SITE.email}`} className="text-cyan hover:underline">
                {SITE.email}
              </a>
            </div>
          </div>

          {/* Attribution - CC BY 4.0 obligation to CAOS / Cameron Sutcliff */}
          <div className="max-w-md">
            <p className="font-mono text-[11px] uppercase tracking-wider text-dim">Built on</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">{SITE.attribution.text}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
              <a href={SITE.attribution.caosSite} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">
                CAOS ↗
              </a>
              <a href={SITE.attribution.caosRepo} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">
                source repo ↗
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between">
          <span>© {SITE.name}. Doctrine contributions © {SITE.attribution.caosAuthor}, CC BY 4.0.</span>
          <span className="font-mono">{SITE.tagline}</span>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 6: Create the five page stubs**

Each of `src/pages/Home.tsx`, `Work.tsx`, `Projects.tsx`, `About.tsx`, `Resume.tsx` gets (component name matching its file):

```tsx
export default function Home() {
  return <section className="mx-auto max-w-5xl px-6 py-20" />
}
```

- [ ] **Step 7: Rewrite `src/App.tsx`**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Work from './pages/Work'
import Projects from './pages/Projects'
import About from './pages/About'
import Resume from './pages/Resume'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/work" element={<Work />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/about" element={<About />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
```

- [ ] **Step 8: Wrap in BrowserRouter in `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 9: Neutralize old imports so the build compiles**

The old `src/components/Hero.tsx`, `SystemSection.tsx`, `Projects.tsx`, `About.tsx` and `src/content/system.ts` are now unreferenced (App no longer imports them). `Hero.tsx` still imports `GithubIcon` locally (its own copy), which is fine; deletion happens in Task 7. Verify nothing else imports `content/system`:

Run: `grep -rn "content/system" /Users/josh/Github/joshuasutcliff.com/src`
Expected: matches only in `src/components/Hero.tsx`, `SystemSection.tsx`, `Projects.tsx`, `About.tsx` (the four legacy files slated for deletion in Task 7). Any other match must be fixed before proceeding.

- [ ] **Step 10: Build and route-check**

Run: `cd /Users/josh/Github/joshuasutcliff.com && npm run build`
Expected: `✓ built` with no TS errors.

Run: `npm run preview -- --port 4173 &` then `for r in / /work /projects /about /resume /nope; do curl -s -o /dev/null -w "$r %{http_code}\n" http://localhost:4173$r; done; kill %1`
Expected: `200` for every route (SPA serves index.html; `/nope` also 200s and redirects client-side).

- [ ] **Step 11: Commit**

```bash
git -C /Users/josh/Github/joshuasutcliff.com add -A
git -C /Users/josh/Github/joshuasutcliff.com commit -m "feat: react-router scaffold with Layout, nav tabs, shared site content

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Home page

**Files:**
- Create: `src/content/home.ts`
- Modify: `src/pages/Home.tsx` (replace stub)

**Interfaces:**
- Consumes: `SITE` from `../content/site`, `ParticleField` from `../components/ParticleField`, `GithubIcon, MailIcon` from `../components/icons`, `Link` from `react-router-dom`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create `src/content/home.ts`**

```ts
export const HOME = {
  intro:
    "I build things that work: servers, networks, home labs, and the occasional desktop app. The discipline came from music first, years of drum corps and marching band where the standard is playing it right every single rep. These days I apply it to infrastructure, and this site is where the work and the life meet.",
  teasers: [
    {
      to: '/work',
      title: 'Work',
      blurb: 'Contract IT in southern New Mexico: systems administration and networking since 2017.',
    },
    {
      to: '/projects',
      title: 'Projects',
      blurb: 'A system monitor, a terminal, a shell customizer, an AI operating kit, and a home lab.',
    },
    {
      to: '/about',
      title: 'About',
      blurb: 'From Wyoming to Georgia to the desert Southwest, by way of a trumpet.',
    },
  ],
}
```

- [ ] **Step 2: Replace `src/pages/Home.tsx`**

```tsx
import { Link } from 'react-router-dom'
import ParticleField from '../components/ParticleField'
import { GithubIcon, MailIcon } from '../components/icons'
import { SITE } from '../content/site'
import { HOME } from '../content/home'

export default function Home() {
  return (
    <div className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(var(--purple-rgb), 0.14), transparent 70%), radial-gradient(50% 40% at 80% 20%, rgba(var(--cyan-rgb), 0.12), transparent 70%)',
        }}
      />
      <ParticleField />

      <section className="relative mx-auto max-w-5xl px-6 pb-16 pt-14 sm:pt-20">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan" /> {SITE.location}
        </p>
        <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-7xl">
          {SITE.name}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-fg sm:text-xl">{SITE.oneLiner}</p>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted">{HOME.intro}</p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href={`mailto:${SITE.email}`}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-6 py-3 text-sm font-medium text-white shadow-[var(--shadow-neon)] transition-transform hover:scale-[1.03]"
          >
            <MailIcon /> Get in touch
          </a>
          <a
            href={SITE.github}
            target="_blank"
            rel="noopener noreferrer"
            className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-fg"
          >
            <GithubIcon /> {SITE.githubHandle}
          </a>
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-3">
          {HOME.teasers.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="glass group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
            >
              <p className="font-display text-lg font-semibold text-fg">
                {t.title} <span className="text-cyan transition-transform group-hover:translate-x-0.5">→</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Build and verify**

Run: `cd /Users/josh/Github/joshuasutcliff.com && npm run build`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git -C /Users/josh/Github/joshuasutcliff.com add -A
git -C /Users/josh/Github/joshuasutcliff.com commit -m "feat: identity-led home page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Work page

**Files:**
- Create: `src/content/work.ts`
- Modify: `src/pages/Work.tsx` (replace stub)

**Interfaces:**
- Consumes: `Link` from `react-router-dom`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create `src/content/work.ts`**

```ts
export const WORK = {
  kicker: 'Work',
  headline: 'Systems that stay up.',
  paragraphs: [
    'I have worked contract IT across southern New Mexico since 2017, specializing in systems administration and networking. The path started at Auburn University with a degree in Information Systems Management and has run through server rooms, network closets, and device fleets ever since.',
    'The day-to-day: Windows Server and Active Directory environments, firewalls and managed switching, mobile device management for field hardware, backup and recovery, and the monitoring to know it is all healthy before anyone has to ask.',
    'Small operations deserve infrastructure that behaves like it belongs to a much bigger one. That is the job.',
  ],
  cta: { to: '/resume', label: 'View resume' },
}
```

- [ ] **Step 2: Replace `src/pages/Work.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { WORK } from '../content/work'

export default function Work() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">{WORK.kicker}</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
        {WORK.headline}
      </h1>
      <div className="mt-8 space-y-5">
        {WORK.paragraphs.map((p) => (
          <p key={p.slice(0, 24)} className="leading-relaxed text-muted">
            {p}
          </p>
        ))}
      </div>
      <div className="mt-10">
        <Link
          to={WORK.cta.to}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-6 py-3 text-sm font-medium text-white shadow-[var(--shadow-neon)] transition-transform hover:scale-[1.03]"
        >
          {WORK.cta.label} →
        </Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Build and public-safety grep**

Run: `cd /Users/josh/Github/joshuasutcliff.com && npm run build && grep -rn "HKDA" src/ ; echo "HKDA grep exit: $?"`
Expected: build green; grep exits 1 (no matches).

- [ ] **Step 4: Commit**

```bash
git -C /Users/josh/Github/joshuasutcliff.com add -A
git -C /Users/josh/Github/joshuasutcliff.com commit -m "feat: work page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Projects page

**Files:**
- Create: `src/content/projects.ts`
- Modify: `src/pages/Projects.tsx` (replace stub)

**Interfaces:**
- Consumes: `GithubIcon` from `../components/icons`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create `src/content/projects.ts`**

```ts
export type ProjectCard = {
  title: string
  blurb: string
  status?: string
  href?: string
  note?: string
}

export type ProjectGroup = {
  heading: string
  cards: ProjectCard[]
}

export const PROJECT_GROUPS: ProjectGroup[] = [
  {
    heading: 'Apps & Tools',
    cards: [
      {
        title: 'Nexus System Monitor',
        blurb:
          'A modern, cross-platform system monitor built with .NET and Avalonia. Real-time CPU, GPU, memory, network, and per-process telemetry in a clean desktop UI.',
        status: 'Active · v0.4.0',
        href: 'https://github.com/joshuadsutcliff/nexus-system-monitor',
      },
      {
        title: 'GhostPane',
        blurb:
          'A Ghostty-flavored terminal for Windows: a compiler that translates a Ghostty config into WezTerm, plus a branded engine installer and updater so the setup survives nightly builds.',
        status: 'Active',
        href: 'https://github.com/joshuadsutcliff/ghostpane',
      },
      {
        title: 'GlassForge',
        blurb:
          'A Windows 11 shell customizer: wallpaper-adaptive glass, theme presets, and specular effects.',
        status: 'On hold',
        href: 'https://github.com/joshuadsutcliff/glassforge',
      },
    ],
  },
  {
    heading: 'AI Operations',
    cards: [
      {
        title: 'Compound AI: Enforced Runtime',
        blurb:
          'The shareable core of my AI operating practice: usage guards, a session router, worker agents, goal contracts, and provenance scripts. Point a fresh agent at the repo and it installs the system end-to-end.',
        status: 'Active',
        href: 'https://github.com/joshuadsutcliff/claude-config-public',
        note: 'Built on the Compound AI Operating Standards by Cameron Sutcliff, CC BY 4.0.',
      },
    ],
  },
  {
    heading: 'Infrastructure',
    cards: [
      {
        title: 'Home lab',
        blurb:
          'A half-rack running a Synology NAS and an ESXi hypervisor on a Dell R710 with purpose-built VMs. Plex server since 2015 with the *arr automation stack; Grafana, Telegraf, and Tautulli monitoring; a Homepage service portal; Pi-hole DNS; push-notification pipelines; and remote dual-boot orchestration for the workstations.',
        status: 'Always on',
      },
      {
        title: 'This website',
        blurb: 'Vite, React, and Tailwind on Vercel. Copy as typed content modules, guarded by a pre-commit hook.',
        status: 'Live',
        href: 'https://github.com/joshuadsutcliff/joshuasutcliff.com',
      },
    ],
  },
]
```

- [ ] **Step 2: Replace `src/pages/Projects.tsx`**

```tsx
import { GithubIcon } from '../components/icons'
import { PROJECT_GROUPS } from '../content/projects'

export default function Projects() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">Projects</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
        Things I build and run.
      </h1>

      {PROJECT_GROUPS.map((group) => (
        <div key={group.heading} className="mt-12">
          <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-muted">{group.heading}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {group.cards.map((card) => {
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-xl font-semibold text-fg">{card.title}</p>
                    {card.status && (
                      <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 font-mono text-[11px] text-muted">
                        {card.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{card.blurb}</p>
                  {card.note && <p className="mt-3 text-xs leading-relaxed text-dim">{card.note}</p>}
                  {card.href && (
                    <p className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-cyan">
                      <GithubIcon className="h-4 w-4" /> View on GitHub →
                    </p>
                  )}
                </>
              )
              return card.href ? (
                <a
                  key={card.title}
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass group flex flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                >
                  {inner}
                </a>
              ) : (
                <div key={card.title} className="glass flex flex-col rounded-2xl p-7">
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 3: Build and banned-vocabulary grep**

Run: `cd /Users/josh/Github/joshuasutcliff.com && npm run build && grep -rniE "seedbox|torrent|nyaa|qbittorrent" src/ ; echo "banned grep exit: $?"`
Expected: build green; grep exits 1 (no matches).

- [ ] **Step 4: Commit**

```bash
git -C /Users/josh/Github/joshuasutcliff.com add -A
git -C /Users/josh/Github/joshuasutcliff.com commit -m "feat: grouped projects page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: About page

**Files:**
- Create: `src/content/about.ts`
- Modify: `src/pages/About.tsx` (replace stub)

**Interfaces:**
- Consumes: `SITE` from `../content/site`, `MailIcon` from `../components/icons`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create `src/content/about.ts`**

```ts
export const ABOUT = {
  kicker: 'About',
  headline: 'Operator, husband, brass player.',
  paragraphs: [
    'I was born in Wyoming, spent early years in New Hampshire, and grew up in southeast Georgia before landing in Las Cruces, New Mexico, where I live now. My wife and I are coming up on twelve years married this August, and I am one of four brothers.',
    'Music got me first. I have played trumpet since sixth grade, marched with the Carolina Crown and Spirit of Atlanta drum and bugle corps in 2008 and 2009, and spent three seasons with the Auburn University Marching Band. Drum corps is where I learned what a high standard actually costs, and that lesson transferred cleanly to a career in IT.',
    'Off the clock I build gaming PCs, run Minecraft servers for friends, and keep a home lab humming. In the fall you will find me in the mountains after deer and elk, with bow, rifle, or muzzleloader depending on the season.',
  ],
}
```

- [ ] **Step 2: Replace `src/pages/About.tsx`**

```tsx
import { MailIcon } from '../components/icons'
import { SITE } from '../content/site'
import { ABOUT } from '../content/about'

export default function About() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <div className="glass rounded-3xl p-8 sm:p-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">{ABOUT.kicker}</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {ABOUT.headline}
        </h1>
        <div className="mt-6 space-y-5">
          {ABOUT.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="leading-relaxed text-muted">
              {p}
            </p>
          ))}
        </div>
        <div className="mt-8">
          <a
            href={`mailto:${SITE.email}`}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
          >
            <MailIcon /> Say hello
          </a>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Build**

Run: `cd /Users/josh/Github/joshuasutcliff.com && npm run build`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git -C /Users/josh/Github/joshuasutcliff.com add -A
git -C /Users/josh/Github/joshuasutcliff.com commit -m "feat: about page

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Resume page

**Files:**
- Create: `src/content/resume.ts`
- Modify: `src/pages/Resume.tsx` (replace stub)

**Interfaces:**
- Consumes: `SITE` from `../content/site`, `MailIcon` from `../components/icons`, `Link` from `react-router-dom`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create `src/content/resume.ts`**

v1 content; Josh refines dates and detail in a follow-up session.

```ts
export const RESUME = {
  summary:
    'Systems administrator and network specialist with eight years of contract IT across southern New Mexico. I keep small-business infrastructure secure, monitored, and recoverable: servers, networks, and device fleets.',
  skills: [
    { area: 'Systems Administration', detail: 'Windows Server, Active Directory, Group Policy' },
    { area: 'Networking', detail: 'Firewalls, managed switching, VLANs, VPN' },
    { area: 'Virtualization', detail: 'VMware ESXi, VM lifecycle and capacity planning' },
    { area: 'Device Management', detail: 'MDM enrollment, policy, and fleet compliance' },
    { area: 'Monitoring', detail: 'Grafana, Telegraf, InfluxDB, alerting pipelines' },
    { area: 'Continuity', detail: 'Backup, recovery, and documentation discipline' },
  ],
  experience: [
    {
      role: 'Systems Administrator & Network Specialist',
      org: 'Independent IT Contractor',
      where: 'Southern New Mexico',
      when: '2017 - present',
      bullets: [
        'Administer Windows Server and Active Directory environments for small-business clients.',
        'Design, deploy, and maintain firewall and managed-switch networks.',
        'Run mobile device management for field-device fleets, from enrollment through retirement.',
        'Build monitoring and alerting so problems surface before users report them.',
        'Own backup and recovery: tested restores, not just scheduled jobs.',
      ],
    },
  ],
  education: {
    school: 'Auburn University',
    degree: 'Information Systems Management',
  },
}
```

- [ ] **Step 2: Replace `src/pages/Resume.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { MailIcon } from '../components/icons'
import { SITE } from '../content/site'
import { RESUME } from '../content/resume'

export default function Resume() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 print:py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">{SITE.name}</h1>
          <p className="mt-1 text-muted">{RESUME.experience[0].role}</p>
          <p className="mt-1 font-mono text-xs text-dim">
            {SITE.location} · {SITE.email} · github.com/{SITE.githubHandle}
          </p>
        </div>
        <a
          href={`mailto:${SITE.email}`}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-purple px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03] print:hidden"
        >
          <MailIcon /> Get in touch
        </a>
      </div>

      <h2 className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-cyan">Summary</h2>
      <p className="mt-3 leading-relaxed text-muted">{RESUME.summary}</p>

      <h2 className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-cyan">Skills</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {RESUME.skills.map((s) => (
          <div key={s.area} className="glass rounded-xl p-4">
            <p className="text-sm font-medium text-fg">{s.area}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.detail}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-cyan">Experience</h2>
      {RESUME.experience.map((e) => (
        <div key={e.role} className="mt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium text-fg">
              {e.role} · <span className="text-muted">{e.org}</span>
            </p>
            <p className="font-mono text-xs text-dim">
              {e.where} · {e.when}
            </p>
          </div>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
            {e.bullets.map((b) => (
              <li key={b.slice(0, 24)}>{b}</li>
            ))}
          </ul>
        </div>
      ))}

      <h2 className="mt-10 font-mono text-sm uppercase tracking-[0.2em] text-cyan">Education</h2>
      <p className="mt-3 text-muted">
        <span className="font-medium text-fg">{RESUME.education.school}</span> · {RESUME.education.degree}
      </p>

      <p className="mt-10 text-sm text-dim print:hidden">
        Selected work lives on the <Link to="/projects" className="text-cyan hover:underline">projects page</Link>.
      </p>
    </section>
  )
}
```

- [ ] **Step 3: Build**

Run: `cd /Users/josh/Github/joshuasutcliff.com && npm run build`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git -C /Users/josh/Github/joshuasutcliff.com add -A
git -C /Users/josh/Github/joshuasutcliff.com commit -m "feat: resume page (v1 content)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Cleanup, metadata, full verification

**Files:**
- Delete: `src/components/Hero.tsx`, `src/components/SystemSection.tsx`, `src/components/Projects.tsx`, `src/components/About.tsx`, `src/content/system.ts`
- Modify: `index.html` (meta + og descriptions), `README.md` (structure section)

**Interfaces:**
- Consumes: everything from Tasks 1-6.

- [ ] **Step 1: Delete legacy files**

Run: `git -C /Users/josh/Github/joshuasutcliff.com rm src/components/Hero.tsx src/components/SystemSection.tsx src/components/Projects.tsx src/components/About.tsx src/content/system.ts`

- [ ] **Step 2: Update `index.html` descriptions**

Replace the `description`, `og:description`, and `twitter:description` (if present) contents with:
`Joshua Sutcliff: husband, musician, and systems administrator in Las Cruces, New Mexico.`
Leave title and og-card image untouched.

- [ ] **Step 3: Update README structure section**

Replace the `## Structure` list to reflect the new layout:

```markdown
## Structure

- `src/content/` - all site copy as typed modules (public-safe content only): `site.ts`, `home.ts`, `work.ts`, `projects.ts`, `about.ts`, `resume.ts`.
- `src/pages/` - Home, Work, Projects, About, Resume (react-router routes).
- `src/components/` - Layout, Footer, ThemeToggle, ParticleField, icons.
- `src/index.css` - Tailwind import + design tokens (dark default, light via `[data-theme]`).
- `public/` - `favicon.svg`, `og-card.png`.
- `scripts/og-card.svg` - source for the social card (`sharp` rasterizes it to `public/og-card.png`).
```

- [ ] **Step 4: Full verification sweep**

Run: `cd /Users/josh/Github/joshuasutcliff.com && npm run build && grep -rn "brass458" src/ index.html README.md ; echo "brass458: $?" ; grep -rniE "seedbox|torrent|nyaa|qbittorrent|HKDA" src/ index.html README.md ; echo "banned: $?" ; grep -rn "content/system" src/ ; echo "legacy import: $?"`
Expected: build green; all three greps exit 1.

Run: `npm run preview -- --port 4173 &` then curl all six routes as in Task 1 Step 10; `kill %1`.
Expected: all 200.

- [ ] **Step 5: Commit**

```bash
git -C /Users/josh/Github/joshuasutcliff.com add -A
git -C /Users/josh/Github/joshuasutcliff.com commit -m "feat: retire single-page explainer, update metadata for identity-led site

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Repo transfers (nexus-system-monitor, glassforge)

Run by the conductor (needs gh multi-account + Gmail): not delegated.

- [ ] **Step 1: Initiate transfers as brass458**

```bash
gh api repos/brass458/nexus-system-monitor/transfer -f new_owner=joshuadsutcliff
gh api repos/brass458/glassforge/transfer -f new_owner=joshuadsutcliff
```

Expected: 202 each; repos remain under brass458 until accepted.

- [ ] **Step 2: Fetch acceptance links from the joshuadsutcliff Gmail** (search `from:github.com transfer newer_than:1d`), surface both links to Josh.

- [ ] **Step 3: After Josh accepts, verify:**

```bash
gh api repos/joshuadsutcliff/nexus-system-monitor --jq '.owner.login'
gh api repos/joshuadsutcliff/glassforge --jq '.owner.login'
```

Expected: `joshuadsutcliff` both.

---

### Task 9: Publish joshuadsutcliff/ghostpane

- [ ] **Step 1: Stage a scrubbed copy** of vault `System/Scripts/ghostpane/` in the scratchpad; draft a README from `System/References/windows-terminal-setup.md` covering: what GhostPane is (Ghostty config compiled to WezTerm on Windows), the compiler, the engine installer/updater, install steps. Scrub: machine names (e.g. the gaming-PC hostname), vault paths, Tailscale details, any personal identifiers. No em dashes.
- [ ] **Step 2: Josh reviews the staged content** (hard gate; repo is public the moment it is created).
- [ ] **Step 3: Create and push:**

```bash
gh auth switch --user joshuadsutcliff
gh repo create joshuadsutcliff/ghostpane --public --description "A Ghostty-flavored terminal for Windows: Ghostty config compiled to WezTerm, with a branded engine installer and updater." --source <staged-dir> --push
gh auth switch --user brass458
```

- [ ] **Step 4: Verify** `https://github.com/joshuadsutcliff/ghostpane` returns 200 and the README renders.

---

### Task 10: Deploy, live verification, vault docs

- [ ] **Step 1: Push** (after Task 8 acceptances so project links resolve):

```bash
gh auth switch --user joshuadsutcliff
git -C /Users/josh/Github/joshuasutcliff.com push origin main
gh auth switch --user brass458
```

- [ ] **Step 2: Live checks** (Vercel ~1 min): curl `https://www.joshuasutcliff.com/{,work,projects,about,resume}` for 200; download the JS bundle and verify it contains `joshuadsutcliff/nexus-system-monitor`, `joshuadsutcliff/ghostpane`, `joshuadsutcliff/glassforge`, `joshuadsutcliff/claude-config-public`, `mailto` target `joshua.d.sutcliff@gmail.com`, and zero `brass458`.
- [ ] **Step 3: Curl each project-card GitHub URL** for 200.
- [ ] **Step 4: Update vault docs:** CLAUDE.md Nexus repo URL (`github.com/joshuadsutcliff/nexus-system-monitor`), `joshuasutcliff-website.md` (new site map, resume-follow-up note), GlassForge archive pointer if it names the old URL. Note in each: old brass458 URLs redirect.
