// Content for the site. All copy here is PUBLIC-SAFE: it describes the operating
// machinery and architecture only. No private vault data, spend figures, client
// names, or host identifiers. Source: the brothers' public configs.

export const SITE = {
  name: 'Joshua Sutcliff',
  tagline: 'Agentic systems and a compounding AI operating practice.',
  subtagline: 'The public face of a private R&D habit.',
  github: 'https://github.com/joshuadsutcliff',
  githubHandle: 'joshuadsutcliff',
}

export const SYSTEM = {
  name: 'Compound AI: Enforced Runtime',
  repo: 'https://github.com/joshuadsutcliff/claude-config-public',
  thesis:
    "A portable AI operating doctrine, made real by a mechanically-enforced runtime. Conventions stop being prose an agent is trusted to honor and become guardrails it cannot route around.",
  origin: {
    headline: 'Built for trust under pressure.',
    body: "Agentic systems are powerful right up until they aren't: runaway loops, blown budgets, silent drift. This runtime makes those failure modes structurally impossible, with enforced limits, verifiable contracts, and a memory that compounds. Hardened against real-world workloads, not just the happy path.",
  },
}

export type Layer = {
  n: string
  title: string
  origin: 'Doctrine' | 'Runtime' | 'Blend'
  body: string
}

export const LAYERS: Layer[] = [
  {
    n: '01',
    title: 'Portable Doctrine',
    origin: 'Doctrine',
    body: 'Vendor-neutral root contracts define how any capable agent should operate, whether it runs on Claude, Cursor, Codex, Aider, or Continue. The standard for what good operation looks like, independent of any one tool.',
  },
  {
    n: '02',
    title: 'Executable Enforcement',
    origin: 'Runtime',
    body: 'Hook scripts turn prose conventions into real blocks. A session router classifies every prompt by weight; it is behavioral, not a model-swapper, so the real savings come from delegating heavy work down rather than from the hook itself. A usage guard hard-stops agent spawns at 90% of the cap and warns at 70%, and the same guard rejects any subagent that would inherit the expensive conductor model, forcing heavy work onto cheaper models by default. A compaction-recovery hook re-grounds the session when context is auto-compacted, restating the objective, reloading the active plan, and re-confirming open tasks, so long runs hold their thread mechanically instead of by recall. The hooks fail open: a broken guard never blocks legitimate work.',
  },
  {
    n: '03',
    title: 'Goal Contracts & Loop Specs',
    origin: 'Blend',
    body: 'Substantial work starts with a six-field contract: objective, completion condition, validation, budget, stop conditions, memory. Recurring loops require three hard stops (max iterations, a no-progress halt, and a budget ceiling wired directly to the usage guard), so the ceiling is a real halt rather than a promise.',
  },
  {
    n: '04',
    title: 'Delegation Economics',
    origin: 'Runtime',
    body: "A conductor/worker model, built around the efficient-fable delegation skill: Claude Fable 5, the premiere model of the day, holds the conductor seat, and the seat tracks the frontier. When a new premiere model ships, it takes the podium and the lesser models fill the worker pool; the machinery runs unchanged when the occupant changes. The conductor only orchestrates, plans, and judges. Token-heavy work is handed to cheaper named workers for research, edits, and test runs. Spec-vs-code reviews fan out in waves, each gated by a usage check. Which work gets delegated, and how, is governed by a scored living playbook: handoff patterns earn their place from recorded run outcomes, not abstract best practice, so the system gets better at delegating from its own history.",
  },
  {
    n: '05',
    title: 'Compounding Memory',
    origin: 'Blend',
    body: "Lessons from real runs are scored, not asserted. A pattern graduates to permanent, queryable memory only when its track record across multiple runs earns it, never on a single good outcome. Knowledge compounds instead of resetting every session. The always-loaded context stays lean by design: only what every session needs rides in the core, and depth is pulled on demand from a structured memory map, so cost stays bounded and signal stays high. Session start also pulls in live context, the day's scheduled events and a scoped alert digest, so work begins from a current picture, not static notes.",
  },
  {
    n: '06',
    title: 'Integrity & Adoption',
    origin: 'Doctrine',
    body: 'SHA-256 manifests and provenance checks let any shared copy be verified as authentic or flagged as forked. A staged adoption process layers the system into an existing repo additively, with atomic rollback, so the runtime travels safely. In practice it is versioned and mirrored across every machine it runs on, with one-step onboarding, so the same enforced runtime follows the work everywhere. Adoption extends to strangers: the public mirror carries an agent-executable integration guide, so pointing a fresh Claude at the repo is enough for it to install the vault workflow and adapt every placeholder to its own host.',
  },
  {
    n: '07',
    title: 'Cognitive Skills',
    origin: 'Doctrine',
    body: 'A toolkit of techniques that auto-invoke when the situation matches: multi-angle synthesis before a decision, adversarial pressure-testing of findings, negating your own default to catch overconfidence, consequence simulation before irreversible actions, and detached judgment to counter sycophancy. Alongside them ride the operational skills the runtime leans on daily, including conductor/worker delegation design, usage-aware pacing across long work, and a status-line convention that makes completion state legible at a glance.',
  },
]

export const FUSION = {
  heading: 'Two systems, near-perfect complements.',
  body: "This is a fusion of two brothers' independent approaches to operating AI agents. One is a clean, portable doctrine: a standard for what good operation looks like, enforced only by prose. The other is a battle-tested runtime: personal, mechanically enforced, hardened by real incidents. Doctrine says what should happen; the runtime makes it actually happen.",
  best:
    "The single best idea in the blend: take the doctrine's budget ceilings and stop conditions, fields an agent is merely trusted to honor, and back them with the runtime's programmatic guard. The ceiling stops being a suggestion.",
}

export type Project = {
  title: string
  blurb: string
  href: string
  cta: string
}

export const PROJECTS: Project[] = [
  {
    title: 'claude-config (public)',
    blurb:
      'The shareable core of the enforced runtime: usage-guard, session-router, and compaction-recovery hooks, named worker and reviewer agents, the phased-review workflow, goal-contract scaffolds, cognitive and delegation skills, and provenance scripts, plus the full memory-vault workflow with an integration guide written for the agent itself. Point a fresh Claude at the repo and it installs and adapts the system end-to-end. Operating machinery, zero work data.',
    href: 'https://github.com/joshuadsutcliff/claude-config-public',
    cta: 'View on GitHub',
  },
]

export const ATTRIBUTION = {
  text: 'Compound AI: Enforced Runtime builds on the Compound AI Operating Standards, a portable, vendor-neutral operating doctrine by Cameron Sutcliff. Doctrine, goal-contract structure, integrity tooling, and the cognitive-skills toolkit derive from CAOS, used under CC BY 4.0.',
  caosSite: 'https://cameronsutcliff.com/compound-ai',
  caosRepo: 'https://github.com/cameronpsutcliff/compound-ai-operating-standards',
  caosAuthor: 'Cameron Sutcliff',
}
