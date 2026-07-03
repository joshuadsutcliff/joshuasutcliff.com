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
