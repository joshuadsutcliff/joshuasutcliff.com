export type ChangelogEntry = {
  date: string
  title: string
  what: string
  why: string
  improvement: string
}

export const CHANGELOG_HEADING = 'Last week in the config'

export const CHANGELOG_INTRO =
  'The runtime is a living system: rules earn their place through incidents, postmortems, and measured wins. What changed the week of July 24 to 30, 2026:'

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: 'Jul 24',
    title: 'Pure-conductor rule made permanent',
    what: 'Revoked the provisional exception that let a fallback orchestrator execute reasoning-heavy work inline instead of delegating it.',
    why: 'The exception regenerated the same debate every session and blurred the cost model whenever the primary model was rate-capped.',
    improvement:
      'One invariant for every session: the orchestrator delegates all bounded execution, no matter which model holds the baton.',
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
    date: 'Jul 26',
    title: 'Runaway-parallelism hardening',
    what: 'A machine-global spawn-rate limiter, a hard ceiling of two concurrent workers, and serialize-by-default waves.',
    why: 'A parallel burst once exhausted a five-hour usage block in about ten minutes while the burn gauge still read low.',
    improvement:
      'Bursts are now mechanically impossible, and operator pace instructions ("slow down", "one at a time") take effect immediately rather than after the current batch.',
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
    date: 'Jul 29',
    title: 'Report integrity',
    what: "Workers may not invent coordination mechanisms their brief never defined; infrastructure diagnoses check the existing runbook before dispatching a worker; edits in auto-syncing repos verify at the commit level, not just on disk.",
    why: 'A worker fabricated a lock file and stalled on it; a diagnosis pass re-derived an answer the runbook already held; verified-on-disk edits were silently discarded by an auto-sync pull.',
    improvement:
      'Fabricated mechanisms are now a discard-and-redispatch signal, one targeted read replaces whole diagnosis dispatches, and writes are durable when declared done.',
  },
  {
    date: 'Jul 30',
    title: 'Credentials, look before asking',
    what: 'Any task needing a credential checks the private secrets store first; the operator is asked only when the credential is not stored.',
    why: 'The orchestrator kept asking for keys and passwords that were already on file.',
    improvement: 'Fewer round-trips, with a mechanical reminder injected on credential-shaped prompts as a backstop.',
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
    title: 'Grep before read',
    what: 'Single-fact lookups in files over roughly 100 lines use targeted search instead of reading the whole file into context.',
    why: 'A handful of unnecessary full reads carries thousands of extra tokens for the rest of a session, re-billed every turn.',
    improvement:
      'First live test answered a lookup with a three-line grep at roughly 3 percent of the full-read cost.',
  },
]
