# JARVIS Redesign: Projects IA + Site-wide HUD Visual Layer

Date: 2026-08-02
Status: Approved design (this doc), pending implementation plan
Owner: Josh (approvals), Claude (conductor)

## Goal

Cure two complaints about the current site: (1) the Projects page is tiles with
walls of text and reads unprofessionally; (2) the whole site feels flat/dull.
Deliver a professional, modern, AI-futuristic ("refined HUD" / J.A.R.V.I.S.)
experience without gimmicks, new dependencies, or bundle bloat.

## Decisions locked with Josh (2026-08-02)

1. Design language applies **site-wide** in this redesign (all five pages plus
   new sub-pages), not Projects-only.
2. **Dark-only.** The light theme and the ThemeToggle component are removed.
3. Effect level: **refined HUD.** Glow accents, data-lines, ambient depth,
   snappy transitions. No scanlines, boot sequences, typing effects, or other
   cinematic chrome.
4. Images: Claude captures what it can (Nexus via the sigmamini UI-automation
   recipes; AI Ops reuses the six existing diagrams). Everything else ships
   text-first plus a wanted-images list for Josh.
5. Sub-pages use **one template component + a content module**, not bespoke
   pages. CSS-only visual layer: no framer-motion, no canvas libraries beyond
   the existing ParticleField.

## Recon findings that shape the design

mitchellsutcliff.com and cameronsutcliff.com share this site's exact token
foundation (same dark stack #07090f/#0b0e16-ish, cyan #06b6d4 / purple
#8b5cf6, same Archivo / Schibsted Grotesk / Martian Mono fonts). Their
"alive" feel comes from usage, not palette: cyan-tinted glass panels, a
pulsing inset-glow "active panel" keyframe, diagonal cyan-to-purple ambient
gradient washes, slow multi-layer background sway, and fast 150-300ms
transitions. Neither uses scanlines or WebGL. This redesign adopts those
mechanisms and extends them with light HUD framing (corner ticks, mono
eyebrow labels, status dots) that neither sibling has.

## Information architecture

### Projects page (`/projects`)

- Group order top to bottom: **Infrastructure, Apps & Tools, AI Operations.**
- **AI Operations collapses to one tile** ("Compound AI: Enforced Runtime");
  the separate "Mechanical Enforcement Layer" tile is removed and its story
  becomes a section of the AI Ops sub-page.
- The six-diagrams section and the config changelog section leave the
  Projects page entirely; both live on the AI Ops sub-page.
- The Projects page after this change is exactly: page header + three compact
  tile groups. Nothing else.

### Tiles

Each tile is compact and uniform:

- Mono uppercase **eyebrow row**: group label + status dot + status text
  (e.g. `ACTIVE · v0.7.0`). Status dot colors: green = active/live/always-on,
  amber = on hold.
- **Title** (display font).
- **TL;DR blurb, 1-2 sentences max** (final copy below).
- **GitHub icon-link** when the project has a repo (stops click propagation).
- The **whole tile is clickable** and routes to the project sub-page, except
  the "This website" tile, which keeps only its repo link (no sub-page: there
  is nothing to say about the site that the site is not already saying).
- Existing secondary-link affordance (the Obsidian + Claude Code setup guide
  on the AI Ops tile) is preserved on the tile.

### Sub-pages (`/projects/<slug>`)

Slugs: `nexus-system-monitor`, `ghostpane`, `glassforge`, `home-lab`,
`ai-operations`.

One `ProjectDetail` template component renders a `projects-detail.ts` content
module keyed by slug. Template structure, in order:

1. **HUD hero**: breadcrumb back to Projects, eyebrow (group + status), title,
   TL;DR line, repo button (and setup-guide button on AI Ops).
2. **Overview prose**: the current long tile copy, edited for the page format
   (short paragraphs, not a single block). Sourced from existing blurbs plus
   each repo's README where useful.
3. **Tech-stack chips**: mono chips (e.g. `.NET 8`, `Avalonia`, `Vite`).
4. **Highlights**: 3-5 bullet capabilities, each one line.
5. **Screenshot gallery**: responsive grid, click for lightbox. Renders only
   when the project has images; absent for text-first projects.
6. AI Ops only: **Mechanical Enforcement Layer** section, **six diagrams**
   (layout below), **changelog accordion**.

Unknown slugs render the Projects page redirect (no 404 surface added).

### AI Operations sub-page specifics

- Narrative: two sections of one story. Section 1 "Enforced Runtime" (what
  the config is, from the current Compound AI blurb, decompressed). Section 2
  "The Mechanical Enforcement Layer" (the honest-sequel story from the
  removed tile, kept nearly verbatim: it is strong copy, just misplaced on a
  tile).
- **Diagrams, compact layout**: alternating two-column rows on desktop
  (thumbnail ~40% width beside its What/Why text, image left on even rows,
  right on odd), stacking to single column on mobile. Clicking a thumbnail
  opens a lightbox at full resolution. This replaces the current full-width
  stacked images and kills the verticality problem.
- **Lightbox**: minimal shared component (dim backdrop, esc/click-outside to
  close, no zoom controls). Reused by the screenshot gallery.
- **Changelog**: the existing changelog.ts content in a collapsed accordion
  ("Config changelog") at the page bottom.
- CC BY attribution note stays with the Enforced Runtime section.

## Final tile copy (TL;DRs)

- **Home lab** (Infrastructure): "A half-rack of always-on services: NAS,
  ESXi, Plex with full automation, Grafana monitoring, and remote dual-boot
  orchestration for the workstations."
- **This website** (Infrastructure): "Vite, React, and Tailwind on Vercel.
  Copy as typed content modules, guarded by a pre-commit hook."
- **Nexus System Monitor** (Apps & Tools): "A cross-platform system monitor
  you design yourself. Real sensor depth on Windows, Linux, and macOS; no
  fabricated readings, ever."
- **GhostPane** (Apps & Tools): "A Ghostty-flavored terminal for Windows:
  Ghostty config in, WezTerm out, with an installer that survives nightlies."
- **GlassForge** (Apps & Tools): "A Windows 11 shell customizer:
  wallpaper-adaptive glass, theme presets, and specular effects."
- **Compound AI: Enforced Runtime** (AI Operations): "An AI operating system
  where the rules are enforced by hooks, not promises: usage guards, session
  routing, tiered delegation, and the circuit breakers that made it honest."

## Site-wide HUD visual layer

All CSS lives in `index.css` (tokens, utilities, keyframes); components adopt
the utilities. No new dependencies.

- **Remove**: `[data-theme='light']` token block, ThemeToggle component and
  its imports, theme-switching logic. `color-scheme: dark` stays.
- **`.hud-panel`** (evolves `.glass`): cyan-tinted glass
  (`rgba(cyan, .03)` base, blur 12-16px), 1px border, and **corner ticks**
  (short cyan strokes at two opposite corners via ::before/::after). Hover:
  border brightens plus a soft inset ring glow (adaptation of the sibling
  `tile-pulse-glow`, single pulse on hover rather than looping).
- **Scan-line divider utility**: 1px horizontal
  `linear-gradient(90deg, transparent, rgba(cyan,.35), transparent)` used
  between page sections and under the nav.
- **Ambient background** (Layout-level, behind ParticleField): fixed diagonal
  `135deg` cyan-to-purple wash at .04-.06 alpha plus a faint dot-grid
  (CSS radial-gradient pattern, ~24px pitch, alpha under .05), with a slow
  sway animation (translate/skew, 30s+ loops, sibling `au-sway` style).
  ParticleField kept and tuned to sit above the wash.
- **Eyebrow label utility**: Martian Mono, uppercase, letter-spacing .12em,
  text-dim, optional status dot (pulse animation on green dots, 3s).
- **Page transitions**: route-level fade + 8px rise on mount, 200ms.
  Section reveal on scroll only if achievable with CSS/IntersectionObserver
  in a few lines; otherwise skip (YAGNI).
- **Interactive speeds**: 150-300ms for all hover/transition states.
- **Reduced motion**: the existing `prefers-reduced-motion` kill-switch
  already zeroes animations; keep it covering everything new.
- **Typography discipline**: page titles move to Archivo display with tighter
  tracking; body stays Schibsted Grotesk; mono reserved for eyebrows, chips,
  status, and code.

Pages beyond Projects (Home, Work, About, Resume, the setup guide page)
adopt: ambient background, hud-panel cards, eyebrow labels, dividers, page
transitions. Their content and layout structure do not change in this
redesign. Resume keeps its print styles untouched (print = plain).

## Routing and files

- New routes: `/projects/:slug` (single route, template component).
- New files: `src/pages/ProjectDetail.tsx`, `src/content/projects-detail.ts`,
  `src/components/Lightbox.tsx`.
- Modified: `index.css` (visual layer), `Layout.tsx` (ambient bg, ThemeToggle
  removal, divider), `Projects.tsx` (tile redesign, group order),
  `projects.ts` (TL;DRs, slugs, merged AI Ops), `App.tsx` (route),
  `GuideObsidianClaude.tsx` + other pages (adopt utilities),
  `changelog.ts`/`diagrams.ts` consumers move to the AI Ops sub-page.
- Removed: `ThemeToggle.tsx`, light-theme CSS block.
- Assets: Nexus screenshots to `public/screenshots/nexus/` (webp, sized
  ~1200px wide, lazy-loaded). Diagrams stay in `public/diagrams/`.

## Constraints and acceptance criteria

- No em dashes anywhere (repo pre-commit hook enforces U+2014 ban).
- No new npm dependencies. Public entry bundle growth budget: +10 KB gzip.
- `npm run build` green; all existing routes still render; /admin untouched;
  api/** untouched; og-card and favicon untouched.
- Umami tracking unaffected (route changes are SPA navigations, auto-tracked).
- Reduced-motion audit passes (every new animation dies under the media query).
- Acceptance: Projects page shows 3 groups in the specified order with 6
  compact tiles; every tile except "This website" routes to a populated
  sub-page; diagrams readable on desktop without full-width verticality;
  lightbox works; site-wide pages carry the HUD layer; Lighthouse performance
  does not regress materially.

## Out of scope

- Rewriting Home/Work/About/Resume content.
- New photography/branding assets beyond screenshots.
- Blog, CMS, or markdown-driven content pipeline.
- SSR/prerendering changes.

## Implementation phasing (preview for the plan)

1. Content restructure: projects.ts TL;DRs + merge, projects-detail.ts,
   routing + ProjectDetail template (text-first).
2. AI Ops sub-page: narrative merge, compact diagrams + Lightbox, changelog
   accordion.
3. Visual layer: index.css utilities/keyframes, Layout ambient background,
   dark-only removal, page adoption.
4. Assets: Nexus screenshot capture and gallery wiring; wanted-images list.
5. Review pass (code-reviewer), Josh copy confirmation, push, live verify,
   vault reference-note update.
