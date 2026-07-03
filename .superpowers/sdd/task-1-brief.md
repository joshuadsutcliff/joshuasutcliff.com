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

