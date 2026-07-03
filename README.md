# joshuasutcliff.com

Personal site for Joshua Sutcliff: a landing page and the public face of
**Compound AI: Enforced Runtime**, a blended AI operating system.

Built with **Vite + React + Tailwind CSS v4**, deployed on **Vercel**.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build → dist/
npm run preview  # serve the production build locally
```

## Structure

- `src/content/` - all site copy as typed modules (public-safe content only): `site.ts`, `home.ts`, `work.ts`, `projects.ts`, `about.ts`, `resume.ts`.
- `src/pages/` - Home, Work, Projects, About, Resume (react-router routes).
- `src/components/` - Layout, Footer, ThemeToggle, ParticleField, icons.
- `src/index.css` - Tailwind import + design tokens (dark default, light via `[data-theme]`).
- `public/` - `favicon.svg`, `og-card.png`.
- `scripts/og-card.svg` - source for the social card (`sharp` rasterizes it to `public/og-card.png`).

## Hooks

The repo carries the CAOS `no-em-dashes` pre-commit hook in `.githooks/`.
Enable it per clone:

```bash
git config core.hooksPath .githooks
```

## Attribution

*Compound AI: Enforced Runtime* builds on the **Compound AI Operating Standards**
by **Cameron Sutcliff** ([cameronsutcliff.com/compound-ai](https://cameronsutcliff.com/compound-ai),
[source](https://github.com/cameronpsutcliff/compound-ai-operating-standards)),
used under **CC BY 4.0**.

## License

Site code © Joshua Sutcliff. Doctrine contributions © Cameron Sutcliff, CC BY 4.0.
