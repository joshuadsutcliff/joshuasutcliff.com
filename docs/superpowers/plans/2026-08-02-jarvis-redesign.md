# JARVIS Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Projects section (compact tiles + per-project sub-pages, merged AI Ops) and apply a site-wide dark-only refined-HUD visual layer.

**Architecture:** Content stays in typed modules under `src/content/`; one `ProjectDetail` template renders `projects-detail.ts` by slug via a `/projects/:slug` route. The visual layer is CSS-only utilities/keyframes in `index.css` adopted by `Layout` and pages. Spec: `docs/superpowers/specs/2026-08-02-jarvis-redesign-design.md` (read it before starting any task).

**Tech Stack:** Vite, React 18, TypeScript, react-router, Tailwind v4 (tokens via `@theme inline`), Vercel.

## Global Constraints

- NO em dashes (U+2014) in any file; the repo pre-commit hook rejects them.
- No new npm dependencies. Entry-bundle growth budget +10 KB gzip total.
- Do not touch `api/**`, `vercel.json`, `/admin` pages, `useSecretAdmin`, print styles in Resume, or Umami wiring.
- Verification cycle per task: `npm run build` (includes `tsc -b`) exit 0, plus the task's listed checks. There is no test framework; do not add one.
- All new animation must die under the existing `prefers-reduced-motion` block.
- Commit after each task with the exact message given; never push (the conductor pushes after Josh's confirmation).
- Copy style: complete sentences, no em dashes, colons/parens instead.

---

### Task 1: Projects data model + compact tiles

**Files:**
- Modify: `src/content/projects.ts` (full rewrite below)
- Modify: `src/pages/Projects.tsx`
- Modify: `src/content/changelog.ts` consumers NOT in this task (leave the changelog + diagrams sections rendering as-is for now; they are removed in Task 3)

**Interfaces:**
- Produces: `ProjectCard` type `{ slug?: string; title: string; tldr: string; status: string; statusTone: 'green' | 'amber'; href?: string; note?: string; secondaryLabel?: string; secondaryHref?: string }` and `PROJECT_GROUPS: ProjectGroup[]` with `ProjectGroup = { heading: string; cards: ProjectCard[] }`. Tasks 2-3 rely on these exact names.

- [ ] **Step 1: Rewrite `src/content/projects.ts`** with group order Infrastructure, Apps & Tools, AI Operations; one AI Ops card; TL;DR copy verbatim from the spec section "Final tile copy". Slugs: `home-lab` (Home lab), none (This website), `nexus-system-monitor`, `ghostpane`, `glassforge`, `ai-operations` (Compound AI: Enforced Runtime). Statuses: Home lab `Always on`/green, This website `Live`/green, Nexus `Active · v0.7.0`/green, GhostPane `Active`/green, GlassForge `On hold`/amber, AI Ops `Active`/green. Keep the AI Ops card's `note` (CC BY attribution) and `secondaryLabel`/`secondaryHref` (setup guide) fields as they are today.
- [ ] **Step 2: Redesign the tile renderer in `Projects.tsx`.** Each card: outer element is a `relative div`; when `slug` exists, an absolutely-positioned react-router `Link` overlay (`absolute inset-0`, `aria-label` = card title) makes the whole tile clickable WITHOUT nesting anchors (invalid HTML). Structure inside: eyebrow row (`font-mono text-[11px] uppercase tracking-[0.14em] text-dim` with a 6px status dot span, `bg-green-400`/`bg-amber-400` by `statusTone`, plus the status text), then title (`font-display text-lg`), then `tldr` (`text-sm text-muted`), then a footer row (`relative z-10`) with the GitHub icon anchor when `href` exists (`target="_blank"`) and the secondary link when present; footer links sit above the overlay via z-index, so no `stopPropagation` is needed. Keep the existing `glass` class on tiles for now (Task 5 swaps it). Remove the old whole-card `<a>` wrapping. *(Amended after Task 1 review: overlay pattern replaces the originally specified Link-wrapping to avoid `<a>`-in-`<a>`.)*
- [ ] **Step 3: Verify.** `npm run build` exit 0. `npm run preview` on a free port, `curl -sL localhost:<port>/projects` returns 200, kill server. Grep check: `grep -n 'Mechanical Enforcement Layer' src/content/projects.ts` returns nothing; `grep -c 'slug' src/content/projects.ts` >= 5.
- [ ] **Step 4: Commit** `git add -A && git commit -m "projects: compact TLDR tiles, merged AI Ops card, Infrastructure-first order"`

### Task 2: Sub-page template + detail content + routing + Lightbox

**Files:**
- Create: `src/content/projects-detail.ts`
- Create: `src/pages/ProjectDetail.tsx`
- Create: `src/components/Lightbox.tsx`
- Modify: `src/App.tsx` (one route line)

**Interfaces:**
- Consumes: `PROJECT_GROUPS`, `ProjectCard` from Task 1 (breadcrumb + hero pull the card by slug).
- Produces: `ProjectDetailEntry` type `{ slug: string; group: string; overview: string[]; stack: string[]; highlights: string[]; images?: { src: string; alt: string; caption?: string }[] }`, `PROJECT_DETAILS: Record<string, ProjectDetailEntry>`; `Lightbox` component `({ src, alt, onClose }: { src: string; alt: string; onClose: () => void })` rendering a fixed backdrop (click or Escape closes, `role="dialog"`). Task 3 reuses `Lightbox` and extends the AI Ops entry.

- [ ] **Step 1: Write `projects-detail.ts`** with entries for all five slugs. `overview` paragraphs: decompress the pre-Task-1 long blurbs (retrieve them from `git show HEAD~1:src/content/projects.ts` if needed) into 2-4 short paragraphs each; Nexus and AI Ops may also draw on their public repo READMEs (do not invent capabilities; only restate existing copy). Stacks: Nexus `.NET 8, Avalonia, Windows / Linux / macOS`; GhostPane `WezTerm, Lua, PowerShell`; GlassForge `.NET, Windows 11`; Home lab `ESXi, Synology, Docker, Grafana, Telegraf`; AI Ops `Claude Code, bash hooks, Obsidian`. Highlights: 3-5 single-line bullets each, factual, pulled from the same source copy. `images` only for `nexus-system-monitor` (empty array placeholder now; Task 6 fills it) and none elsewhere.
- [ ] **Step 2: Write `Lightbox.tsx`** exactly: fixed inset-0 z-50 backdrop `bg-black/80 backdrop-blur-sm`, centered `<img>` max-h/max-w 90%, `useEffect` keydown listener for Escape calling `onClose`, backdrop `onClick={onClose}`, image click `stopPropagation`.
- [ ] **Step 3: Write `ProjectDetail.tsx`**: `useParams()` slug; unknown slug returns `<Navigate to="/projects" replace />`. Renders: breadcrumb `Link` "back to projects" (mono, text-dim), hero block (eyebrow group+status from the matching `ProjectCard`, `font-display text-3xl` title, tldr line, repo button anchor when `href`, secondary button when present), overview paragraphs, stack chips row (mono text-xs, bordered pills), highlights list, image grid (only when `images?.length`, each opens `Lightbox` via local state). Set `document.title` like `GuideObsidianClaude.tsx` does.
- [ ] **Step 4: Add route** in `App.tsx`: `<Route path="/projects/:slug" element={<ProjectDetail />} />` adjacent to the existing projects route.
- [ ] **Step 5: Verify.** Build exit 0. Preview server: curl `/projects/nexus-system-monitor`, `/projects/ai-operations`, `/projects/does-not-exist` all 200 (SPA shell). Grep: every slug in `projects.ts` with a truthy `slug` has a key in `PROJECT_DETAILS` (compare by eye, list both sets in the report).
- [ ] **Step 6: Commit** `git add -A && git commit -m "projects: sub-page template, detail content module, lightbox, /projects/:slug route"`

### Task 3: AI Operations sub-page (diagrams + changelog move)

**Files:**
- Modify: `src/content/projects-detail.ts` (AI Ops entry gains sections)
- Modify: `src/pages/ProjectDetail.tsx` (AI Ops-only blocks)
- Modify: `src/pages/Projects.tsx` (remove diagrams + changelog sections)

**Interfaces:**
- Consumes: `DIAGRAMS_ENTRIES`, `DIAGRAMS_HEADING`, `DIAGRAMS_INTRO` from `src/content/diagrams.ts`; `CHANGELOG_ENTRIES`, `CHANGELOG_HEADING`, `CHANGELOG_INTRO` from `src/content/changelog.ts`; `Lightbox` from Task 2. None of those three content files change.
- Produces: `ProjectDetailEntry` gains optional `extraSections?: { heading: string; paragraphs: string[] }[]` and optional flag `showDiagrams?: boolean; showChangelog?: boolean` (true only on `ai-operations`).

- [ ] **Step 1: Extend the AI Ops entry**: `extraSections` = one section "The Mechanical Enforcement Layer" whose paragraphs are the removed tile's blurb (from `git show` history of `projects.ts` before Task 1) split into 3 paragraphs, copy kept near-verbatim; set `showDiagrams: true, showChangelog: true`.
- [ ] **Step 2: Diagram layout in `ProjectDetail.tsx`** (rendered when `showDiagrams`): heading + intro from diagrams.ts, then one row per entry: CSS grid `md:grid-cols-[2fr_3fr]` with the image order-swapped on odd rows (`md:order-2`), image as a `button` opening `Lightbox` with the full-size src, `loading="lazy"`, rounded border; beside it the title (font-display), "What it shows" and "Why it's built this way" paragraphs (`text-sm text-muted`). Single column on mobile.
- [ ] **Step 3: Changelog accordion** (when `showChangelog`): native `<details>` element (no JS state), `<summary>` styled mono with the changelog heading; inside, the existing changelog rendering markup moved from `Projects.tsx`.
- [ ] **Step 4: Delete** the diagrams section and changelog section JSX (and their now-unused imports) from `Projects.tsx`.
- [ ] **Step 5: Verify.** Build exit 0. Preview: `/projects` page no longer contains the strings "six diagrams" or the changelog heading in served JS chunk for Projects (grep the built `dist/assets/*.js` for `DIAGRAMS_HEADING` usage is fine to skip; instead confirm visually via curl of preview + grep source: `grep -c 'DIAGRAMS' src/pages/Projects.tsx` = 0, `grep -c 'CHANGELOG' src/pages/Projects.tsx` = 0, both >= 1 in `ProjectDetail.tsx`).
- [ ] **Step 6: Commit** `git add -A && git commit -m "ai-ops sub-page: enforcement narrative, compact diagram rows with lightbox, changelog accordion"`

### Task 4: HUD visual layer core (CSS + Layout, dark-only)

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/Layout.tsx`
- Delete: `src/components/ThemeToggle.tsx`
- Modify: any file importing ThemeToggle or setting `data-theme` (search `grep -rn "ThemeToggle\|data-theme" src/ index.html`)

**Interfaces:**
- Produces: CSS classes `hud-panel`, `hud-eyebrow`, `hud-divider`, `hud-dot`, `page-enter`, keyframes `hud-glow-in`, `dot-pulse`, `ambient-sway-a/b/c`. Task 5 applies these class names verbatim.

- [ ] **Step 1: index.css surgery.** Delete the entire `[data-theme='light']` block. Add after the `.glass` rules:

```css
/* HUD layer */
.hud-panel {
  position: relative;
  background: rgba(var(--cyan-rgb), 0.03);
  border: 1px solid var(--border);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.25s ease;
}
.hud-panel::before,
.hud-panel::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: rgba(var(--cyan-rgb), 0.55);
  border-style: solid;
  pointer-events: none;
  transition: border-color 0.2s ease;
}
.hud-panel::before { top: -1px; left: -1px; border-width: 1px 0 0 1px; border-top-left-radius: 6px; }
.hud-panel::after { bottom: -1px; right: -1px; border-width: 0 1px 1px 0; border-bottom-right-radius: 6px; }
.hud-panel:hover { border-color: var(--border-bright); background: rgba(var(--cyan-rgb), 0.05); }
.hud-panel:hover::before, .hud-panel:hover::after { border-color: var(--cyan); }
@keyframes hud-glow-in {
  from { box-shadow: inset 0 0 0 1px rgba(var(--cyan-rgb), 0.0), 0 0 0 rgba(var(--cyan-rgb), 0); }
  to { box-shadow: inset 0 0 0 1px rgba(var(--cyan-rgb), 0.25), 0 4px 24px rgba(var(--cyan-rgb), 0.12); }
}
.hud-panel:hover { animation: hud-glow-in 0.25s ease forwards; }

.hud-eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--dim);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.hud-dot { width: 6px; height: 6px; border-radius: 9999px; display: inline-block; }
.hud-dot--green { background: #22c55e; animation: dot-pulse 3s ease-in-out infinite; }
.hud-dot--amber { background: #f59e0b; }
@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
  50% { box-shadow: 0 0 6px 2px rgba(34, 197, 94, 0.25); }
}

.hud-divider {
  height: 1px;
  border: 0;
  background: linear-gradient(90deg, transparent, rgba(var(--cyan-rgb), 0.35), transparent);
}

.page-enter { animation: page-enter 0.2s ease both; }
@keyframes page-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Ambient background layers (mounted in Layout behind content) */
.ambient-wash {
  position: fixed;
  inset: -10%;
  z-index: -2;
  pointer-events: none;
  background:
    linear-gradient(135deg, transparent 20%, rgba(var(--cyan-rgb), 0.05) 38%, rgba(var(--purple-rgb), 0.04) 55%, transparent 70%);
  animation: ambient-sway-a 38s ease-in-out infinite alternate;
}
.ambient-grid {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: radial-gradient(rgba(var(--cyan-rgb), 0.045) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 75%);
  animation: ambient-sway-b 47s ease-in-out infinite alternate;
}
@keyframes ambient-sway-a { from { transform: translate(-14px, 0) skew(0.4deg); } to { transform: translate(15px, -8px) skew(-0.4deg); } }
@keyframes ambient-sway-b { from { transform: translate(6px, -4px); } to { transform: translate(-8px, 5px); } }
```

- [ ] **Step 2: Layout.tsx.** Remove the `ThemeToggle` import and element; add `<div aria-hidden className="ambient-wash" />` and `<div aria-hidden className="ambient-grid" />` as first children of the root div; add `<hr className="hud-divider mx-auto max-w-5xl" />` directly under the nav; wrap `<Outlet />` in `<main className="page-enter" key={location.pathname}>` using `useLocation()` so the enter animation re-runs per route.
- [ ] **Step 3: Delete `ThemeToggle.tsx`** and every other `data-theme` setter found by the grep (check `index.html` inline scripts; if a theme-restore script exists there, delete it and leave `color-scheme: dark`).
- [ ] **Step 4: Verify.** Build exit 0. `grep -rn 'data-theme' src/ index.html` returns only the `:root` CSS selector line (or nothing). Preview: all five routes + `/guides/obsidian-claude-setup` + one project sub-page all 200. Confirm ParticleField still renders (its canvas mounts; check its component is untouched).
- [ ] **Step 5: Commit** `git add -A && git commit -m "hud layer: dark-only tokens, hud-panel/eyebrow/divider utilities, ambient background, page transitions"`

### Task 5: HUD adoption across pages

**Files:**
- Modify: `src/pages/Projects.tsx`, `src/pages/ProjectDetail.tsx`, `src/pages/Home.tsx`, `src/pages/Work.tsx`, `src/pages/About.tsx`, `src/pages/Resume.tsx`, `src/pages/GuideObsidianClaude.tsx`

**Interfaces:**
- Consumes: Task 4 class names verbatim (`hud-panel`, `hud-eyebrow`, `hud-dot hud-dot--green|--amber`, `hud-divider`).

- [ ] **Step 1: Projects + ProjectDetail**: swap tile/card `glass` classes to `hud-panel rounded-2xl` (keep existing padding/rounding utilities); group headings become `hud-eyebrow` rows with `hud-divider` running to the right edge (flex row: eyebrow + flex-1 divider); tile status dots use `hud-dot hud-dot--green|--amber` per `statusTone`.
- [ ] **Step 2: Other pages**: on Home/Work/About/Resume/Guide, replace section-card `glass` with `hud-panel` (screen only: Resume print styles must not gain HUD chrome; wrap changes in existing `print:`-safe classes, spot-check the print stylesheet still renders plain), and convert existing small-caps/section labels to `hud-eyebrow`. Do not restructure any page's content or layout.
- [ ] **Step 3: Verify.** Build exit 0. `grep -rn 'className="glass' src/pages/ | wc -l` reports 0 (Layout nav pills may keep `glass`; only page cards swap). Preview all routes 200. Resume print check: `npm run preview`, curl the resume route, and confirm the print CSS block still contains no `hud-` selectors (`grep -n 'print' src/pages/Resume.tsx` unchanged vs git diff).
- [ ] **Step 4: Commit** `git add -A && git commit -m "hud adoption: panels, eyebrows, dividers across all pages"`

### Task 6: Nexus screenshots + gallery fill

**Files:**
- Create: `public/screenshots/nexus/*.webp` (3-4 images)
- Modify: `src/content/projects-detail.ts` (fill the Nexus `images` array)
- Create: `docs/superpowers/wanted-images.md` (list for Josh: GhostPane terminal shot, GlassForge shell shot, home-lab rack/Grafana shot)

**Process note:** the conductor orchestrates this task directly (it crosses into app automation on this machine): launch Nexus on sigmamini, capture dashboard + a second view via the established AX/screencapture recipes, `cwebp -q 82 -resize 1200 0` (or `sips` to png then cwebp; if cwebp is absent use sips jpeg at quality 80 and name `.jpg`, adjusting srcs), verify each file under 250 KB, then fill `images` with real alt text and captions.

- [ ] **Step 1:** Capture and process images into `public/screenshots/nexus/`.
- [ ] **Step 2:** Fill the Nexus `images` array; each entry gets a factual alt string describing the visible view.
- [ ] **Step 3:** Write `wanted-images.md` (three bullets, what shot + suggested size).
- [ ] **Step 4: Verify.** Build exit 0; preview `/projects/nexus-system-monitor` 200; `ls -la public/screenshots/nexus` shows files under 250 KB each.
- [ ] **Step 5: Commit** `git add -A && git commit -m "nexus: screenshot gallery assets + wanted-images list"`

### Task 7: Spec-drift review + fixes

- [ ] **Step 1:** Dispatch a code-reviewer agent with the spec + `git diff <pre-task-1>..HEAD` to check: spec coverage (every acceptance criterion), em-dash scan across all changed files, bundle-size delta (`npm run build` output gzip sizes vs the pre-redesign build, budget +10 KB entry), reduced-motion coverage of every new keyframe, dead code (unused ThemeToggle/theme imports, unused changelog/diagram imports in Projects), a11y basics (Lightbox dialog semantics, alt text present, focus not trapped).
- [ ] **Step 2:** Conductor triages findings; fixes go to a code-generator worker; re-verify build.
- [ ] **Step 3: Commit** `git add -A && git commit -m "review fixes: <summary>"` (only if fixes were made).

### Task 8: Ship

- [ ] **Step 1:** Conductor presents the visual result to Josh (preview screenshots of Projects, one sub-page, AI Ops diagrams section, Home) and waits for the push word (site standing directive).
- [ ] **Step 2:** Push via `gh auth switch --user joshuadsutcliff`, `git push origin main`, switch back to brass458.
- [ ] **Step 3:** Live verify with redirect-following curl: `curl -sL https://joshuasutcliff.com/projects/ai-operations` 200 and the new entry JS bundle contains `hud-panel`.
- [ ] **Step 4:** Update the vault reference note `System/References/joshuasutcliff-website.md` (new routes, removed ThemeToggle/light theme, sub-page architecture, spec/plan paths) and note the apex-308 curl gotcha if not already recorded.

## Self-Review (completed at authoring)

- Spec coverage: IA (T1-T3), tile copy (T1), sub-pages (T2), AI Ops merge + diagrams + changelog (T3), visual layer + dark-only (T4), site-wide adoption (T5), images (T6), constraints/acceptance (T7), push gate + live verify + vault note (T8). Guide-page adoption covered in T5. No gaps found.
- Placeholder scan: none. Type consistency: `ProjectCard`/`ProjectDetailEntry`/class names repeated verbatim across tasks.
- Known judgment calls: nav pills keep `glass` (small chrome, not content panels); scroll-reveal skipped per spec YAGNI clause.

---

# Addendum tasks (2026-08-03): cosmic backgrounds + native schematics

Approved continuation. Same Global Constraints as above, plus: all canvas
work stays inside the single background component (one rAF loop, pause on
document.hidden, static frame under prefers-reduced-motion), and the spec
addendum in 2026-08-02-jarvis-redesign-design.md ("Addendum (2026-08-03)")
is the authoritative description.

### Task 9: Route-aware cosmic background component

**Files:**
- Modify: `src/components/ParticleField.tsx` (full evolution; may rename internals but keep the exported component name)
- Modify: `src/components/Layout.tsx` (mount it above the ambient divs, aria-hidden, fixed canvas)
- Modify: `src/pages/Home.tsx` (remove its own ParticleField mount)

**Interfaces:**
- Produces: `<ParticleField mode={mode} />` where `mode: 'constellation' | 'spiral' | 'orbital' | 'nebula' | 'singularity'`. Layout derives mode from `useLocation().pathname`: `/` constellation; `/work` orbital; `/about` nebula; `/resume` singularity; everything else (projects, sub-pages, guides) spiral.

- [ ] **Step 1:** Evolve ParticleField: keep the existing constellation renderer as mode `constellation` (visually unchanged on Home). Add renderers:
  - `spiral`: 2-3 logarithmic spiral arms (r = a * e^(b*theta), b ~ 0.18-0.25), 80-140 particles seeded along arms with jitter, whole field rotating at ~0.02 rad/s around a point offset toward the top-right third; particle color lerps cyan (core) to purple (tips); alpha 0.25-0.5.
  - `orbital`: 2-3 invisible attractor points; 40-70 particles on precomputed elliptical orbits (parametric angles advanced per frame, no n-body integration); every few seconds one faint elliptical path arc fades in/out (stroke alpha <= 0.06).
  - `nebula`: 25-40 large (8-24px) heavily blurred circles (shadowBlur or radial gradients), drifting slowly with 2-layer parallax; peak alpha ~0.14 each (0.05 proved sub-perceptible on real displays; amended 2026-08-03 during animation debugging).
  - `singularity`: one thin particle ellipse (accretion ring) of 50-70 tiny particles positioned in the viewport corner away from the content column (right edge, upper third), rotating extremely slowly; plus a faint darker radial core. Near-static feel.
  Shared: cap total particles at the current Home count or lower per mode; single rAF; pause when document.hidden (visibilitychange); prefers-reduced-motion renders one static frame and stops; resize handling preserved; canvas remains `position: fixed`, `pointer-events: none`, behind content but above the ambient wash (z-index between the ambient layers and content, e.g. 0 with content wrappers already above; verify layering against the ambient-grid fix: do NOT reintroduce an opaque background on the Layout root).
- [ ] **Step 2:** Layout mounts `<ParticleField mode={...} />` keyed by mode (so mode changes remount cleanly); Home.tsx drops its local mount and any `isolate` wrapper that existed only for it (verify Home visuals unchanged otherwise).
- [ ] **Step 3:** Verify: build exit 0; all routes 200; grep confirms exactly one `<ParticleField` mount in src/pages+components (the Layout one); no em dashes.
- [ ] **Step 4:** Commit `git add -A && git commit -m "cosmic backgrounds: route-aware particle modes (constellation/spiral/orbital/nebula/singularity)"`

### Task 10: Schematic vocabulary + pilot diagram (master architecture)

**Files:**
- Create: `src/components/Schematic.tsx`
- Create: `src/content/schematics.ts` (types + the `architecture` entry only)
- Modify: `src/pages/ProjectDetail.tsx` (diagram rows render `<Schematic>` when a schematic entry exists for the diagram id, else fall back to the PNG thumbnail; PNG stays available behind a mono "view original" link that opens the existing Lightbox either way)

**Interfaces:**
- Produces (types in schematics.ts, used by Tasks 11-12 verbatim):
```ts
export type SchematicNode = { id: string; label: string; sub?: string; accent?: 'star' | 'none' }
export type SchematicGroup = { id: string; title?: string; nodes: SchematicNode[]; direction?: 'row' | 'column' }
export type SchematicEdge = { from: string; to: string; style?: 'flow' | 'return' | 'orbit'; label?: string }
export type SchematicGate = { id: string; label: string; kind: 'deny' | 'limit' }
export type SchematicSpec = { id: string; title: string; groups: SchematicGroup[]; edges: SchematicEdge[]; gates?: SchematicGate[]; footnote?: string }
export const SCHEMATICS: Record<string, SchematicSpec>
```
- `<Schematic spec={SchematicSpec} />` renders groups as HUD panels of node boxes (mono labels, real text), edges as SVG connectors overlaying the flex/grid layout (measured via refs; straight `flow` = thin cyan line with slow dash animation, `return` = dotted dim line, `orbit` = curved quadratic path), gates as small chips with a gravity-well ring motif (`kind: 'deny'` = darker core + thin event-horizon ring), star-accent nodes get a soft radial glow. Fully responsive: below md, groups stack and edges hide (order + group structure carries the flow; add a small "flow: A > B > C" mono caption fallback below the stacked groups so mobile keeps the sequence).
- [ ] **Step 1:** Build Schematic.tsx + the `architecture` spec entry: hooks column (session router, usage guard, session timer, tripwire as gate chips feeding in), conductor node (star accent), worker pool group (Haiku/Sonnet/Opus/free tier), vault memory node, edges: prompt flow through hooks to conductor, delegation flow to workers, dotted return edges, orbit edge conductor-to-vault. Content mirrors diagrams.ts `architecture` what-text; keep every label under 20 chars.
- [ ] **Step 2:** ProjectDetail: diagram row renders `<Schematic>` when `SCHEMATICS[entry.id]` exists (architecture only for now), PNG fallback otherwise; "view original" link added in both cases.
- [ ] **Step 3:** Verify: build exit 0; /projects/ai-operations 200; reduced-motion: dash animation under the global kill switch; no em dashes.
- [ ] **Step 4:** Commit `git add -A && git commit -m "schematics: component vocabulary + native master-architecture pilot"`
- [ ] **Step 5:** STOP. Controller presents the pilot to Josh (browser screenshots, desktop + 375px). Remaining diagrams proceed only on his visual approval.

### Task 11: Schematics batch 1 (hook-flow, session-router)
**Files:** Modify: `src/content/schematics.ts` only.
- [ ] Add `hook-flow` (four sequential gates as deny/limit chips with the gravity-well motif, spawn flowing through, deny paths dropping to a "denied" node) and `session-router` (prompt node, classifier, three tier lanes LIGHT/MEDIUM/HEAVY with HEAVY ending in a plan-then-stop gate) entries, content mirroring each diagrams.ts what-text. Verify + commit `git add -A && git commit -m "schematics: hook-flow + session-router"`

### Task 12: Schematics batch 2 (field-rules, delegation-ladder, before-after)
**Files:** Modify: `src/content/schematics.ts` only (check diagrams.ts for the actual ids/titles of diagrams 4-6 and mirror them).
- [ ] Add the remaining three entries in the same pattern. The before/after diagram becomes two stacked lane groups (before = red-tinted chips, after = green-tinted; extend SchematicNode with optional `tone?: 'good' | 'bad'` if needed, updating the type in place). Verify + commit `git add -A && git commit -m "schematics: remaining three diagrams native"`

### Task 13: Addendum review + ship
- [ ] Whole-addendum review (Task 9..12 range) on the strongest available reviewer: spec-addendum acceptance criteria, bundle budget (+10 KB total still), reduced-motion, perf sanity (rAF count, particle caps, no layout thrash from edge measurement), a11y (schematic real-text readability, canvas aria-hidden), em dashes, mobile 375px readability of all six schematics.
- [ ] ONE fix wave + one scoped re-review if findings; controller browser-verifies every schematic + every background mode.
- [ ] Present to Josh; on push word: push, live verify, vault reference-note update, SDD workspace cleanup.
