# joshuasutcliff.com Remodel: Identity-Led Multi-Page Site

**Date:** 2026-07-03 · **Status:** Approved by Josh (design round, plus homelab-content amendment)

## Goal

Convert the single-page Compound AI explainer site into a five-page personal site modeled on
the brothers' sites: identity-led home page (like mitchellsutcliff.com), grouped projects page
(like cameronsutcliff.com), plus Work, About, and Resume pages. Migrate all public-facing
brass458 repos to the joshuadsutcliff account. The site must never reference brass458.

## Constraints

- **Visual identity unchanged:** dark glass, cyan/purple neon, particle field, theme toggle,
  existing design tokens in `src/index.css`. Structure changes; skin does not.
- **No em dashes** anywhere in the repo (pre-commit hook enforces; use commas, colons,
  semicolons, periods, hyphens).
- **Public-safe copy:** no client or employer names, no hostnames or IPs, no torrent/seedbox/
  nyaa/IPT content, no granular homelab identifiers. Nature of the work only.
- **Attribution obligation:** CC BY 4.0 credit to Cameron Sutcliff / Compound AI Operating
  Standards stays in the footer.
- **Stack:** Vite + React + Tailwind v4 on Vercel, unchanged. Add `react-router-dom` only.

## Architecture

- **Routing:** `react-router-dom` with real routes: `/` (Home), `/work`, `/projects`,
  `/about`, `/resume`. `vercel.json` SPA rewrite already covers deep links. Unknown paths
  redirect to `/`.
- **Layout shell:** shared `Layout` component: top nav (tabs: Home, Work, Projects, About,
  Resume + GitHub icon + ThemeToggle), page outlet, shared `Footer` (email button, GitHub
  link, CC BY attribution, copyright). `ParticleField` renders on Home only.
- **Content/config split:** all copy lives in `src/content/` typed modules, one per page
  (`home.ts`, `work.ts`, `projects.ts`, `about.ts`, `resume.ts`, plus shared `site.ts` for
  name, email, GitHub, one-liner). Components render content; they contain no prose.
- **Removed:** `SystemSection`, layers/fusion/origin explainer content, the old single-page
  `system.ts` structure (SITE/ATTRIBUTION fields migrate to `site.ts`).

## Pages

### Home (`/`)
- Hero: name, one-liner **"Husband, musician, and systems administrator."**, short warm
  intro paragraph (arc: marching brass to server racks; builds things that work), location
  tag "Las Cruces, New Mexico".
- Buttons: **Get in touch** (`mailto:joshua.d.sutcliff@gmail.com`) and **GitHub**
  (github.com/joshuadsutcliff).
- Three teaser cards routing to Work, Projects, About.
- Meta/OG description updated to the identity one-liner.

### Work (`/work`)
- Short professional story, generic by design: contract IT in southern New Mexico since
  2017; specialty in systems administration and networking; path started at Auburn
  University with an Information Systems Management degree.
- One paragraph on the nature of the work: server and domain infrastructure, network
  equipment, device fleet management, monitoring. No client names.
- CTA button to `/resume`.

### Projects (`/projects`)
Grouped cards, Cameron-style. Each card: title, one-to-two sentence blurb, status tag where
relevant, link.

- **Apps & Tools**
  - *Nexus System Monitor*: modern cross-platform system monitor, .NET/Avalonia, v0.4.0.
    Links to `github.com/joshuadsutcliff/nexus-system-monitor` (post-transfer).
  - *GhostPane*: WezTerm-based terminal for Windows compiled from a Ghostty config; branded
    engine installer + updater. Links to `github.com/joshuadsutcliff/ghostpane` (new repo).
  - *GlassForge*: Windows 11 shell customizer (wallpaper-adaptive glass, theme presets).
    Status "on hold". Links to `github.com/joshuadsutcliff/glassforge` (post-transfer).
- **AI Operations**
  - *Compound AI: Enforced Runtime*: the public operating kit; hooks, guards, delegation
    machinery. Links to `github.com/joshuadsutcliff/claude-config-public`. Carries a short
    attribution note referencing CAOS.
- **Infrastructure**
  - *Home lab*: half-rack build; Synology NAS; ESXi hypervisor on a Dell R710 running
    purpose-built VMs; Plex server since 2015; the *arr automation stack; Grafana, Telegraf,
    and Tautulli monitoring with dashboards; Homepage service portal; Pi-hole DNS; ntfy-style
    notification pipelines; remote dual-boot orchestration. Nature-of-work only, no repo
    link, no hostnames/IPs, no torrent content.
  - *This website*: Vite/React/Tailwind on Vercel. Links to
    `github.com/joshuadsutcliff/joshuasutcliff.com`.

### About (`/about`)
Three short employer-readable paragraphs:
1. **Origin:** born in Wyoming, lived in New Hampshire, grew up in southeast Georgia, now
   Las Cruces, New Mexico. Married going on twelve years; one of four brothers.
2. **Music:** trumpet since 6th grade; Carolina Crown and Spirit of Atlanta DCI corps
   ('08/'09); Auburn University Marching Band ('09, '10, '13).
3. **Hobbies:** building gaming PCs, running Minecraft servers, the home lab, and deer/elk
   hunting with bow, rifle, and muzzleloader.

### Resume (`/resume`)
Print-friendly single column. v1 uses known facts; Josh refines dates/details afterward.
- Summary (systems administrator / network specialist, contract IT since 2017).
- Skills grid: systems administration, networking, virtualization (ESXi), device fleet
  management (MDM), monitoring (Grafana/Telegraf), Windows Server / Active Directory.
- Experience: Contract IT, Systems Administrator & Network Specialist, 2017-present,
  southern New Mexico, generic scope bullets.
- Education: Auburn University, Information Systems Management.
- Projects cross-link to `/projects`.
- "Get in touch" mailto button.

## Repo migration (separate work stream, same effort)

1. Transfer `brass458/nexus-system-monitor` and `brass458/glassforge` to joshuadsutcliff
   (acceptance emails to the joshuadsutcliff inbox; old URLs auto-redirect so clones keep
   working). Surface acceptance links to Josh via Gmail lookup.
2. Skip the `terminal` fork (Microsoft's code). Private repos (`claude-config`,
   `lora-trainers`, `obsidian-vault`) untouched.
3. Create public `joshuadsutcliff/ghostpane` from vault `System/Scripts/ghostpane/` plus a
   README distilled from the windows-terminal-setup doc. Scrub machine names, personal
   paths, and any vault-specific references before publishing. Josh reviews the scrubbed
   content before the repo goes live.
4. Update vault CLAUDE.md and reference docs with new repo URLs after transfers complete.

## Testing / verification

- `npm run build` (typecheck + Vite) green.
- Every route renders via `npm run preview` and direct deep-link (SPA rewrite).
- Repo-wide grep: zero `brass458`, zero em dashes, zero banned terms (client names,
  hostnames, torrent vocabulary).
- Post-deploy: curl live routes, verify nav links, mailto href, GitHub links, and that all
  project card links resolve (200) under joshuadsutcliff.

## Out of scope

- Resume specifics (exact dates, certs, past roles): follow-up session per Josh.
- Any restyle of the visual system; any blog/essay machinery; analytics.
