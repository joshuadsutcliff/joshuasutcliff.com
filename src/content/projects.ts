export type ProjectCard = {
  slug?: string
  title: string
  tldr: string
  status: string
  statusTone: 'green' | 'amber'
  href?: string
  note?: string
  secondaryLabel?: string
  secondaryHref?: string
}

export type ProjectGroup = {
  heading: string
  cards: ProjectCard[]
}

export const PROJECT_GROUPS: ProjectGroup[] = [
  {
    heading: 'Infrastructure',
    cards: [
      {
        slug: 'home-lab',
        title: 'Home lab',
        tldr: 'A half-rack of always-on services: NAS, ESXi, Plex with full automation, Grafana monitoring, and remote dual-boot orchestration for the workstations.',
        status: 'Always on',
        statusTone: 'green',
      },
      {
        title: 'This website',
        tldr: 'Vite, React, and Tailwind on Vercel. Copy as typed content modules, guarded by a pre-commit hook.',
        status: 'Live',
        statusTone: 'green',
        href: 'https://github.com/joshuadsutcliff/joshuasutcliff.com',
      },
    ],
  },
  {
    heading: 'Apps & Tools',
    cards: [
      {
        slug: 'nexus-system-monitor',
        title: 'Nexus System Monitor',
        tldr: 'A cross-platform system monitor you design yourself. Real sensor depth on Windows, Linux, and macOS; no fabricated readings, ever.',
        status: 'Active · v0.7.0',
        statusTone: 'green',
        href: 'https://github.com/joshuadsutcliff/nexus-system-monitor',
      },
      {
        slug: 'ghostpane',
        title: 'GhostPane',
        tldr: 'A Ghostty-flavored terminal for Windows: Ghostty config in, WezTerm out, with an installer that survives nightlies.',
        status: 'Active',
        statusTone: 'green',
        href: 'https://github.com/joshuadsutcliff/ghostpane',
      },
      {
        slug: 'glassforge',
        title: 'GlassForge',
        tldr: 'A Windows 11 shell customizer: wallpaper-adaptive glass, theme presets, and specular effects.',
        status: 'On hold',
        statusTone: 'amber',
        href: 'https://github.com/joshuadsutcliff/glassforge',
      },
    ],
  },
  {
    heading: 'AI Operations',
    cards: [
      {
        slug: 'ai-operations',
        title: 'Compound AI: Enforced Runtime',
        tldr: 'An AI operating system where the rules are enforced by hooks, not promises: usage guards, session routing, tiered delegation, and the circuit breakers that made it honest.',
        status: 'Active',
        statusTone: 'green',
        href: 'https://github.com/joshuadsutcliff/claude-config-public',
        note: 'Built on the Compound AI Operating Standards by Cameron Sutcliff, CC BY 4.0.',
        secondaryLabel: 'Setup guide: Obsidian + Claude Code',
        secondaryHref: '/guides/obsidian-claude-setup',
      },
      {
        slug: 'monitoring-stack',
        title: 'Agentic Monitoring Stack',
        tldr: 'A complete home-network monitoring stack in one charter file. Your AI agent reads it, interviews you for your network details, then builds Pi-hole DNS, Grafana metrics, phone alerts, UPS awareness, remote management, and dual dashboards on whatever box you dedicate to it: a Raspberry Pi 5, an old desktop, or a VM. There is no installer script: the agent is the installer.',
        status: 'Active',
        statusTone: 'green',
        href: 'https://github.com/joshuadsutcliff/agentic-driven-monitoring-stack',
      },
    ],
  },
]
