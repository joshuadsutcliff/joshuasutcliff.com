export type ChangelogEntry = {
  date: string
  title: string
  what: string
  why: string
  improvement: string
}

export const CHANGELOG_HEADING = 'Recent changes in the config'

export const CHANGELOG_INTRO =
  'The runtime is a living system: rules earn their place through incidents, postmortems, and measured wins. Newest first.'

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: 'Aug 26',
    title: 'Public mirror brought current',
    what: 'Refreshed the public configuration mirror with the current rule set and eight additional reviewed skills.',
    why: 'The mirror had drifted behind the working configuration more than once, and a mirror nobody trusts is worse than no mirror at all.',
    improvement: 'The published rule set moved from 84 entries to 93, and the drift check now runs as part of closing a session rather than when someone remembers.',
  },
  {
    date: 'Aug 25',
    title: 'An enforcement hook that could never fire',
    what: 'A guard meant to force review consultations through a proxy was tested on both its allow path and its deny path. It logged neither. The reviewing tool runs server side and has no name a local check can match, so no guard of that kind can ever intercept it.',
    why: 'The guard had been reported as working on the strength of its own code being correct. Correct code in an unreachable position is still unreachable.',
    improvement: 'Replaced with a check that audits after the fact instead of claiming to prevent. The rule it encoded is now documented as a convention, which is all it ever was.',
  },
  {
    date: 'Aug 24',
    title: 'Mining old sessions returned nothing',
    what: 'A pass over a backlog of session transcripts, looking for corrections that had never been captured as rules, found zero new rules. All seven candidates it surfaced were already covered.',
    why: 'The scoring pass over-fires on ordinary task language, so a raw candidate count reads like a finding when it is noise.',
    improvement: 'A null result is now recorded as reinforcement against existing rules rather than filed as a failure, which is the honest reading of it.',
  },
  {
    date: 'Aug 17',
    title: 'Rules can now retire',
    what: 'Every rule in the knowledge base gained a lifecycle: whether it is active, what superseded it, and the boundary of where it applies.',
    why: 'A knowledge base that only grows becomes a knowledge base nobody reads.',
    improvement: 'The first audit merged two duplicate rules and retired four imported from another system that were already covered. The audit filter itself matched nothing, which was the real finding: the set is too young to prune by age, so recurrence count is the signal instead.',
  },
  {
    date: 'Aug 17',
    title: 'Rules compiled into enforcement',
    what: 'Corrections that keep recurring are now compiled into mechanical checks that run before the action they govern, instead of living only as prose.',
    why: 'A written rule depends on the model recalling it at the exact moment context is longest and attention is thinnest.',
    improvement: 'Seven rules moved from prose to enforcement in a single pass, and every rule now carries a field recording whether it is enforced, conventional, or still pending.',
  },
  {
    date: 'Aug 16',
    title: 'One tracking surface for open threads',
    what: 'Every open loop that does not belong to a project ledger now lives in one file, written when a session closes and read when the next one opens.',
    why: 'Open threads were recorded in session logs, which are append-only and never revisited, so anything not finished in one sitting was effectively lost.',
    improvement: 'Work that spans sessions survives the gap, and closing an item removes it from the live list in the same edit that records the closure.',
  },
  {
    date: 'Aug 15',
    title: 'One expensive worker per round',
    what: 'Capped the number of high-cost reasoning workers that can be spawned in a single fan-out to one, on a rolling window.',
    why: 'The orchestrator could justify several expensive workers in one round, one brief at a time, and each justification looked reasonable on its own.',
    improvement: 'Remaining slots in a fan-out have to use cheaper tiers, so one round cannot quietly become the most expensive thing a session does.',
  },
  {
    date: 'Aug 14',
    title: 'Executor and advisor split',
    what: 'Separated the model that runs the session loop from the model that reviews its decisions. A frontier-model advisor is consulted when an approach is being committed to, when the same error keeps recurring, and before any work is declared done.',
    why: 'A model reviewing its own plan is not a second opinion. Routing the judgment calls to a different model at fixed points makes the review independent of the work.',
    improvement: 'Plans get challenged before execution rather than after it, and the advisor reads the full session, so its guidance arrives without a context handoff.',
  },
  {
    date: 'Jul 30',
    title: 'Grep before read',
    what: 'Single-fact lookups in files over roughly 100 lines use targeted search instead of reading the whole file into context.',
    why: 'A handful of unnecessary full reads carries thousands of extra tokens for the rest of a session, re-billed every turn.',
    improvement:
      'First live test answered a lookup with a three-line grep at roughly 3 percent of the full-read cost.',
  },
  {
    date: 'Jul 30',
    title: 'Cheaper session brackets',
    what: 'Fast-path variants of the session-open and session-close routines, with session-log assembly delegated to a low-cost worker pinned to minimal reasoning effort.',
    why: 'Opening and closing a session cost more orchestrator tokens than some of the short sessions they bracketed.',
    improvement: 'Routine brackets now spend premium tokens only on judgment, not assembly.',
  },
  {
    date: 'Jul 30',
    title: 'Credentials, look before asking',
    what: 'Any task needing a credential checks the private secrets store first; the operator is asked only when the credential is not stored.',
    why: 'The orchestrator kept asking for keys and passwords that were already on file.',
    improvement: 'Fewer round-trips, with a mechanical reminder injected on credential-shaped prompts as a backstop.',
  },
  {
    date: 'Jul 29',
    title: 'Report integrity',
    what: "Workers may not invent coordination mechanisms their brief never defined; infrastructure diagnoses check the existing runbook before dispatching a worker; edits in auto-syncing repos verify at the commit level, not just on disk.",
    why: 'A worker fabricated a lock file and stalled on it; a diagnosis pass re-derived an answer the runbook already held; verified-on-disk edits were silently discarded by an auto-sync pull.',
    improvement:
      'Fabricated mechanisms are now a discard-and-redispatch signal, one targeted read replaces whole diagnosis dispatches, and writes are durable when declared done.',
  },
  {
    date: 'Jul 26',
    title: 'Worker accountability',
    what: 'Every delegation brief now demands completion proof (the exact verification commands run, plus their output) and a hard per-tier time budget; two-strike and ten-minute stuck rules govern failed or stranded workers.',
    why: 'A stranded worker once left the orchestrator waiting an hour for a completion that had already happened at minute 26.',
    improvement:
      '"I did the work" no longer counts; "here is the proof it succeeded" does, and no single silent wait can exceed ten minutes.',
  },
  {
    date: 'Jul 26',
    title: 'Runaway-parallelism hardening',
    what: 'A machine-global spawn-rate limiter, a hard ceiling of two concurrent workers, and serialize-by-default waves.',
    why: 'A parallel burst once exhausted a five-hour usage block in about ten minutes while the burn gauge still read low.',
    improvement:
      'Bursts are now mechanically impossible, and operator pace instructions ("slow down", "one at a time") take effect immediately rather than after the current batch.',
  },
  {
    date: 'Jul 24',
    title: 'No blind delegation',
    what: "Every subagent dispatch now injects the current usage-burn level and that band's routing policy into context at the moment of fan-out.",
    why: 'Delegation decisions were being made without seeing the budget they were spending.',
    improvement:
      'Routing shifts down to cheaper workers automatically as burn climbs; silent under 50 percent, progressively stricter above it.',
  },
  {
    date: 'Jul 24',
    title: 'Pure-conductor rule made permanent',
    what: 'Revoked the provisional exception that let a fallback orchestrator execute reasoning-heavy work inline instead of delegating it.',
    why: 'The exception regenerated the same debate every session and blurred the cost model whenever the primary model was rate-capped.',
    improvement:
      'One invariant for every session: the orchestrator delegates all bounded execution, no matter which model holds the baton.',
  },
]
