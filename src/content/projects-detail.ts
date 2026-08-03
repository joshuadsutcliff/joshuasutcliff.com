export type ProjectDetailEntry = {
  slug: string
  group: string
  overview: string[]
  stack: string[]
  highlights: string[]
  images?: { src: string; alt: string; caption?: string }[]
  extraSections?: { heading: string; paragraphs: string[] }[]
  showDiagrams?: boolean
  showChangelog?: boolean
}

export const PROJECT_DETAILS: Record<string, ProjectDetailEntry> = {
  'nexus-system-monitor': {
    slug: 'nexus-system-monitor',
    group: 'Apps & Tools',
    overview: [
      'Nexus System Monitor is a modern system monitor built with .NET and Avalonia: the monitor you design yourself, not a fixed layout someone else picked for you.',
      'It surfaces real-time CPU, GPU, memory, network, and per-process telemetry with native sensor depth on Windows, Linux, and macOS, including Apple Silicon temperatures and GPU telemetry.',
      'The dashboard is fully customizable, so you decide what to see and how it is laid out.',
      'It is honest by design: no fabricated readings, ever. If a sensor cannot be read on a given platform, the monitor says so instead of making something up.',
    ],
    stack: ['.NET 8', 'Avalonia', 'Windows / Linux / macOS'],
    highlights: [
      'Real-time CPU, GPU, memory, network, and per-process telemetry',
      'Native sensor depth on Windows, Linux, and macOS, including Apple Silicon temperatures and GPU telemetry',
      'Fully customizable dashboard: design the monitor yourself',
      'Honest by design: no fabricated readings, ever',
    ],
    images: [
      {
        src: '/screenshots/nexus/dashboard.jpg',
        alt: 'Nexus System Monitor dashboard on macOS: System Health view with an overall health score ring, CPU, memory, disk, and GPU status cards, and a performance bottleneck analysis panel.',
        caption: 'System Health dashboard (macOS, Apple Silicon)',
      },
      {
        src: '/screenshots/nexus/performance.jpg',
        alt: 'Nexus System Monitor Performance view: live CPU utilization, memory usage, disk I/O, and network charts for an Apple M4, with a per-core utilization grid and per-drive usage bars.',
        caption: 'Performance view with live charts and per-core utilization',
      },
      {
        src: '/screenshots/nexus/processes.jpg',
        alt: 'Nexus System Monitor Processes view: a sortable process table with per-process CPU, memory, threads, and user columns, plus search, grouping, and an info panel.',
        caption: 'Processes view with search, grouping, and per-process telemetry',
      },
    ],
  },
  ghostpane: {
    slug: 'ghostpane',
    group: 'Apps & Tools',
    overview: [
      'GhostPane brings a Ghostty-flavored terminal to Windows, where Ghostty itself does not run natively.',
      'At its core is a compiler that translates a Ghostty configuration file into an equivalent WezTerm configuration, so the same config language works on Windows.',
      'A branded engine installer and updater wrap the underlying WezTerm runtime, keeping the setup working as WezTerm ships nightly builds.',
    ],
    stack: ['WezTerm', 'Lua', 'PowerShell'],
    highlights: [
      'Compiles a Ghostty config into a working WezTerm configuration',
      'Branded engine installer for the underlying WezTerm runtime',
      'Updater keeps the install current across WezTerm nightly builds',
    ],
  },
  glassforge: {
    slug: 'glassforge',
    group: 'Apps & Tools',
    overview: [
      'GlassForge is a shell customizer for Windows 11 focused on a cohesive glass aesthetic across the desktop.',
      'It adapts translucent glass surfaces to the current wallpaper, with theme presets for quick styling changes.',
      'Specular effects add a further layer of visual polish to windows and shell surfaces.',
    ],
    stack: ['.NET', 'Windows 11'],
    highlights: [
      'Wallpaper-adaptive glass surfaces',
      'Theme presets for quick styling changes',
      'Specular effects on shell surfaces',
    ],
  },
  'home-lab': {
    slug: 'home-lab',
    group: 'Infrastructure',
    overview: [
      'The home lab is a half-rack running a Synology NAS alongside an ESXi hypervisor on a Dell R710, with purpose-built VMs for each service.',
      'A Plex server has run since 2015, backed by the *arr automation stack for library management.',
      'Grafana, Telegraf, and Tautulli provide monitoring; a Homepage service portal gives a single pane of glass; Pi-hole handles DNS; and push-notification pipelines surface alerts.',
      'Remote dual-boot orchestration lets the workstations be switched between operating systems without walking up to them.',
    ],
    stack: ['ESXi', 'Synology', 'Docker', 'Grafana', 'Telegraf'],
    highlights: [
      'Synology NAS + ESXi hypervisor on a Dell R710 with purpose-built VMs',
      'Plex server since 2015 with the *arr automation stack',
      'Grafana, Telegraf, and Tautulli monitoring, Homepage portal, Pi-hole DNS',
      'Push-notification alert pipelines',
      'Remote dual-boot orchestration for the workstations',
    ],
  },
  'ai-operations': {
    slug: 'ai-operations',
    group: 'AI Operations',
    overview: [
      'This is the shareable core of my AI operating practice: usage guards, a session router, worker agents, goal contracts, and provenance scripts, now extended with a usage-adaptive delegation ladder.',
      'A free-model tier, Forge running OpenRouter free models plus a direct Gemini free-tier lane as a congestion-proof reserve, absorbs second opinions, adjudications, and copy review at zero token cost.',
      'Routing shifts down-ladder as the paid usage window fills, and a capability floor keeps repo-dependent and precision work on capable models: regulation, not degradation.',
      'A spec-driven planning IDE, Kiro, feeds source-verified product interviews into the same loop. Point a fresh agent at the repo and it installs the system end-to-end.',
    ],
    stack: ['Claude Code', 'bash hooks', 'Obsidian'],
    highlights: [
      'Usage guards, session router, worker agents, goal contracts, and provenance scripts',
      'Usage-adaptive delegation ladder with a free-model tier (Forge + Gemini) for zero-cost second opinions',
      'Capability floor keeps repo-dependent and precision work on capable models',
      'Kiro spec-driven planning IDE feeds source-verified interviews into the loop',
      'Installs end-to-end by pointing a fresh agent at the repo',
    ],
    extraSections: [
      {
        heading: 'The Mechanical Enforcement Layer',
        paragraphs: [
          'The honest sequel to the conductor/orchestra architecture: written rules failed three times. The conductor drifted into doing worker jobs inline; it inline-integrated a 250-line worker draft while designing the compliance tests for that exact rule; and after launching three concurrent test sessions that burned 36% of a weekly usage cap in 32 minutes, it was told emphatically to stop; it serialized, and kept the next 24 sessions running at full throughput.',
          'The root cause is behavioral, not ignorance: task-completion drive overrides compliance drive once the model has momentum, and it will always construct a technically-compliant reading that permits continuing.',
          'The fix is a circuit breaker, not another rule: a machine-global spawn-rate limiter that hard-denies runaway fan-outs, a plan-then-stop gate that holds multi-step work until the plan is approved, a tripwire that logs execution-shaped conductor output, and a hard two-agent parallel ceiling. Voluntary compliance is a bonus; the hooks are the safety mechanism.',
        ],
      },
    ],
    showDiagrams: true,
    showChangelog: true,
  },
}
