export type DiagramEntry = {
  id: string
  title: string
  image: string
  alt: string
  what: string
  why: string
}

export const DIAGRAMS_HEADING = 'The system in seven diagrams'

export const DIAGRAMS_INTRO =
  'Seven diagrams cover the whole design: what runs where, what is mechanically enforced versus behaviorally expected, and what the enforcement layer measurably changed. They are drawn for both audiences: if you are new to agent orchestration, read each "What it shows" first; if you run agent fleets yourself, the "Why it\'s built this way" notes carry the design rationale and the incidents behind it.'

export const DIAGRAMS_ENTRIES: DiagramEntry[] = [
  {
    id: 'architecture',
    title: 'Master architecture: one prompt, end to end',
    image: '/diagrams/diagram-1-architecture.png',
    alt: 'Diagram of a prompt flowing through four enforcement hooks into a conductor model, which delegates to a tiered pool of worker models and persists memory to an Obsidian vault.',
    what: 'The full life of a request. A user prompt first passes through four enforcement hooks that inject policy into context before the model acts: the session router (classifies the prompt\'s weight), the usage guard (budget and spawn-rate limits), the session timer (long-session nudges), and the conductor tripwire (flags execution-shaped output). It then reaches the conductor, the frontier model whose only job is judgment: plan, decompose, delegate, verify, synthesize, report. All bounded execution goes to a tiered pool of cheaper workers (Haiku for mechanical work, Sonnet as the default executor, Opus for reasoning-heavy bounded tasks, and a free-tier model for second opinions), whose results flow back (dotted lines) for the conductor to re-verify. An Obsidian vault serves as persistent memory across sessions.',
    why: 'Frontier-model tokens are the most expensive resource in the loop. Spending them exclusively on judgment while cheaper models handle volume work is what makes the system 3–5× more cost-efficient, but that split only holds if something enforces it, which is what the hook layer is for. The model asked nicely does not stay disciplined; the model blocked by a shell script does.',
  },
  {
    id: 'hook-flow',
    title: 'Hook enforcement flow: every subagent spawn runs this gauntlet',
    image: '/diagrams/diagram-2-hook-enforcement.png',
    alt: 'Flowchart of four sequential policy gates a subagent spawn must clear: explicit worker model, usage cap, account-mutex serialization, and a spawn-rate circuit breaker.',
    what: 'The gate sequence a subagent spawn must clear. Policy 1 denies any spawn that fails to name an explicit worker model, so nothing silently inherits the expensive conductor model. Policy 2 denies all spawns once usage reaches 90% of the cap. Policy 3 is a mutex that serializes workers touching machine-global GitHub-account state, because concurrent account switches land writes under the wrong identity. M1 is a rate limiter: more than 4 spawns in 5 minutes trips a circuit breaker. Only a spawn that clears all four gates runs, and even then the hook injects the current budget-burn band into context so the delegation decision is made with the price tag visible.',
    why: 'Each gate is a scar. The rate limiter exists because one parallel fan-out burned 36% of a weekly usage cap in 32 minutes. Written rules against exactly that had failed three times before: the model that writes a rule can also rationalize around it, but it cannot rationalize around a script that returns "deny."',
  },
  {
    id: 'session-router',
    title: 'Session router: right-sizing the response before any work starts',
    image: '/diagrams/diagram-3-session-router.png',
    alt: 'Diagram of a prompt-classification hook routing incoming prompts into LIGHT, MEDIUM, or HEAVY tiers, with a plan-then-stop gate on HEAVY.',
    what: 'A hook that classifies every incoming prompt before the model sees it. System notifications and advisory questions pass through untouched. Everything else is routed by keyword and length heuristics into three tiers: LIGHT (answer directly, no subagents), MEDIUM (delegate the heavy lifting to cheap workers), or HEAVY, which triggers a binding plan-then-stop gate: state the scope, list atomic steps, estimate cost, and stop for approval before executing anything. Prompts that look credential-shaped get an extra injected reminder to check the local secrets store before asking the user for passwords or keys.',
    why: 'The two expensive failure modes are opposites: burning frontier tokens over-answering a cheap question, and diving into a large job without an approved plan. Both are cheapest to correct before the first token is spent, so the classification happens at prompt-submit time, the one point where the cost of every downstream decision is still zero.',
  },
  {
    id: 'field-rules',
    title: 'Conductor behavioral rules: the behavioral layer above the hooks',
    image: '/diagrams/diagram-4-behavioral-rules.png',
    alt: 'Diagram grouping conductor behavioral rules by phase: before execution, during execution, on failure, and user overrides.',
    what: 'The rules the conductor follows that hooks cannot mechanically check, grouped by when they bind. Before execution: check the stored secrets before asking the user, grep large files instead of reading them whole, check budget burn before any fan-out. During: a hard ceiling of 2 parallel workers, serialize by default, worker scripts run in sandboxes rather than live repos, and every worker gets a time budget by tier. On failure: a two-strike rule (never dispatch a third worker at the same failed task), a 10-minute stuck rule (report rather than wait silently), and degraded-session detection that recommends a fresh start. User overrides: pace instructions ("slow down", "one at a time") take effect immediately, and an explicit user order to execute inline is honored, but flagged once, so overrides stay visible and cannot silently erode the policy.',
    why: 'Every rule here traces to a specific logged incident: a destroyed in-progress edit, an hour wasted waiting on a stranded worker, a runaway parallel burst. Hooks catch what a script can detect; the field rules encode the postmortem lessons that require judgment to apply. It is all scar tissue with a date attached.',
  },
  {
    id: 'claude-md',
    title: 'CLAUDE.md lean core: memory as a paging system',
    image: '/diagrams/diagram-5-claudemd-structure.png',
    alt: 'Diagram of a three-tier memory architecture: an 8,000-token always-loaded core with a pointer map, on-demand reference notes, and self-triggering skills.',
    what: 'The three-tier memory architecture. The always-loaded core file is capped at 8,000 tokens and holds only what every session needs: identity, the behavioral rules, active-project deltas, and, critically, a pointer table (the "memory map") naming which reference note to fetch for which kind of work. Depth lives in those on-demand notes: per-system runbooks, project status ledgers, and a gitignored secrets store. Skills (packaged procedures) load themselves when a situation matches their trigger description rather than sitting in context permanently.',
    why: 'An always-loaded instruction file is a recurring tax: every line is paid for again at every session start, forever. Capping the core and pushing depth behind pointers makes context pay-per-use: a session doing website work never pays for the home-lab runbook. It is the same idea as paging in operating systems: keep the working set small and fault the rest in on demand.',
  },
  {
    id: 'cost-comparison',
    title: 'Before and after: what the enforcement layer measurably changed',
    image: '/diagrams/diagram-6-before-after.png',
    alt: 'Side-by-side comparison of a $31 runaway session before enforcement against an average $1.46 session after enforcement, roughly a 95 percent reduction.',
    what: 'The measured effect of turning written rules into enforced ones. Before (July 25): a single runaway session spent $31 in 32 minutes, 36% of a weekly usage cap, with 81% of the spend coming from subagent bursts and the conductor doing $27.87 of the work itself instead of delegating. After (July 26 onward): sessions average $1.46, about 2% of the weekly cap each, with zero 4-plus-parallel bursts; the rate limiter has fired and held, and the heavy-task approval gate has been honored every time it triggered.',
    why: 'These numbers are the falsifiability of the whole design. Anyone can claim their agent framework saves money; this one keeps the incident that motivated the enforcement layer and the before/after measurements in the open: roughly a 95% reduction in cost per session on comparable work. The raw dollar figures stay because "trust me, it\'s cheaper" is exactly the kind of unverifiable claim the config bans internally.',
  },
  {
    id: 'predictive-injections',
    title: 'Predictive Injection System',
    image: '/diagrams/diagram-7-predictive-injections.png',
    alt: 'Flowchart: a user prompt fans out to seven parallel pattern-matchers, each emitting a constraint injection that combines with the session tier policy into context delivered before the model generates.',
    what: 'The router doesn\'t just classify: it pattern-matches seven risky prompt shapes (blanket authorization, minimizing language, inline-override requests, batched asks, remote-host work, sycophancy bait, irreversible actions) and injects each one\'s counter-constraint into context before the model generates. The model reads the constraint before forming its response.',
    why: 'Correcting a bad response after the fact costs a retry and still leaves the wrong action in the transcript. Injecting the counter-constraint before generation means the model never drafts the risky response in the first place, because the rule that would have overridden it is already load-bearing context.',
  },
]
