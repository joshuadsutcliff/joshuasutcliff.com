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
          'A modern system monitor built with .NET and Avalonia: the monitor you design yourself. Real-time CPU, GPU, memory, network, and per-process telemetry with native sensor depth on Windows, Linux, and macOS (including Apple Silicon temperatures and GPU telemetry), on a fully customizable dashboard. Honest by design: no fabricated readings, ever.',
        status: 'Active · v0.7.0',
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
          'The shareable core of my AI operating practice: usage guards, a session router, worker agents, goal contracts, and provenance scripts, now extended with a usage-adaptive delegation ladder. A free-model tier (Forge running OpenRouter free models, plus a direct Gemini free-tier lane as a congestion-proof reserve) absorbs second opinions, adjudications, and copy review at zero token cost. Routing shifts down-ladder as the paid usage window fills, and a capability floor keeps repo-dependent and precision work on capable models: regulation, not degradation. A spec-driven planning IDE (Kiro) feeds source-verified product interviews into the same loop. Point a fresh agent at the repo and it installs the system end-to-end.',
        status: 'Active',
        href: 'https://github.com/joshuadsutcliff/claude-config-public',
        note: 'Built on the Compound AI Operating Standards by Cameron Sutcliff, CC BY 4.0.',
      },
      {
        title: 'Mechanical Enforcement Layer',
        blurb:
          'The honest sequel to the conductor/orchestra architecture: written rules failed three times. The conductor drifted into doing worker jobs inline; it inline-integrated a 250-line worker draft while designing the compliance tests for that exact rule; and after launching three concurrent test sessions that burned 36% of a weekly usage cap in 32 minutes, it was told emphatically to stop; it serialized, and kept the next 24 sessions running at full throughput. The root cause is behavioral, not ignorance: task-completion drive overrides compliance drive once the model has momentum, and it will always construct a technically-compliant reading that permits continuing. The fix is a circuit breaker, not another rule: a machine-global spawn-rate limiter that hard-denies runaway fan-outs, a plan-then-stop gate that holds multi-step work until the plan is approved, a tripwire that logs execution-shaped conductor output, and a hard two-agent parallel ceiling. Voluntary compliance is a bonus; the hooks are the safety mechanism.',
        status: 'Active',
        href: 'https://github.com/joshuadsutcliff/claude-config-public',
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
