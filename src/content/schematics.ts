export type SchematicNode = {
  id: string
  label: string
  sub?: string
  accent?: 'star' | 'none'
  tone?: 'good' | 'bad'
}
export type SchematicGroup = { id: string; title?: string; nodes: SchematicNode[]; direction?: 'row' | 'column' }
export type SchematicEdge = { from: string; to: string; style?: 'flow' | 'return' | 'orbit'; label?: string }
export type SchematicGate = { id: string; label: string; kind: 'deny' | 'limit' }
export type SchematicSpec = {
  id: string
  title: string
  groups: SchematicGroup[]
  edges: SchematicEdge[]
  gates?: SchematicGate[]
  footnote?: string
}

export const SCHEMATICS: Record<string, SchematicSpec> = {
  architecture: {
    id: 'architecture',
    title: 'One prompt, end to end',
    gates: [
      { id: 'session-router', label: 'session router', kind: 'limit' },
      { id: 'usage-guard', label: 'usage guard', kind: 'deny' },
      { id: 'session-timer', label: 'session timer', kind: 'limit' },
      { id: 'tripwire', label: 'tripwire', kind: 'limit' },
    ],
    groups: [
      {
        id: 'conductor-group',
        nodes: [{ id: 'conductor', label: 'conductor', sub: 'judgment only', accent: 'star' }],
        direction: 'column',
      },
      {
        id: 'workers',
        title: 'worker pool',
        nodes: [
          { id: 'haiku', label: 'haiku', sub: 'mechanical' },
          { id: 'sonnet', label: 'sonnet', sub: 'default' },
          { id: 'opus', label: 'opus', sub: 'reasoning' },
          { id: 'free-tier', label: 'free tier', sub: 'second opinion' },
        ],
        direction: 'column',
      },
      {
        id: 'memory',
        nodes: [{ id: 'vault', label: 'vault memory', sub: 'persistent' }],
        direction: 'column',
      },
    ],
    edges: [
      { from: 'session-router', to: 'conductor', style: 'flow' },
      { from: 'usage-guard', to: 'conductor', style: 'flow' },
      { from: 'session-timer', to: 'conductor', style: 'flow' },
      { from: 'tripwire', to: 'conductor', style: 'flow' },
      { from: 'conductor', to: 'haiku', style: 'flow' },
      { from: 'conductor', to: 'sonnet', style: 'flow' },
      { from: 'conductor', to: 'opus', style: 'flow' },
      { from: 'conductor', to: 'free-tier', style: 'flow' },
      { from: 'haiku', to: 'conductor', style: 'return' },
      { from: 'sonnet', to: 'conductor', style: 'return' },
      { from: 'opus', to: 'conductor', style: 'return' },
      { from: 'free-tier', to: 'conductor', style: 'return' },
      { from: 'conductor', to: 'vault', style: 'orbit', label: 'memory' },
    ],
    footnote: 'Hooks enforce the split; the conductor never executes directly.',
  },
  'hook-flow': {
    id: 'hook-flow',
    title: 'Every subagent spawn runs this gauntlet',
    gates: [
      { id: 'policy1', label: 'explicit model', kind: 'deny' },
      { id: 'policy2', label: 'usage >= 90%', kind: 'deny' },
      { id: 'policy3', label: 'gh-auth mutex', kind: 'deny' },
      { id: 'm1', label: 'rate limiter', kind: 'limit' },
    ],
    groups: [
      {
        id: 'start',
        nodes: [{ id: 'spawn', label: 'spawn', sub: 'subagent request' }],
        direction: 'column',
      },
      {
        id: 'outcome',
        title: 'outcome',
        nodes: [
          { id: 'denied', label: 'denied', sub: 'spawn blocked' },
          { id: 'allowed', label: 'allowed', sub: 'burn-band injected', accent: 'star' },
        ],
        direction: 'column',
      },
    ],
    edges: [
      { from: 'spawn', to: 'policy1', style: 'flow' },
      { from: 'policy1', to: 'policy2', style: 'flow' },
      { from: 'policy2', to: 'policy3', style: 'flow' },
      { from: 'policy3', to: 'm1', style: 'flow' },
      { from: 'm1', to: 'allowed', style: 'flow' },
      { from: 'policy1', to: 'denied', style: 'return', label: 'no' },
      { from: 'policy2', to: 'denied', style: 'return', label: 'no' },
      { from: 'policy3', to: 'denied', style: 'return', label: 'no' },
      { from: 'm1', to: 'denied', style: 'return', label: 'no' },
    ],
    footnote: 'Each gate is a script that returns deny, not a rule the model could talk itself around.',
  },
  'session-router': {
    id: 'session-router',
    title: 'Right-sizing the response before any work starts',
    gates: [
      { id: 'plan-gate', label: 'plan then stop', kind: 'limit' },
      { id: 'cred-gate', label: 'credential check', kind: 'limit' },
    ],
    groups: [
      {
        id: 'input',
        nodes: [{ id: 'prompt', label: 'prompt', sub: 'user input' }],
        direction: 'column',
      },
      {
        id: 'classifier-group',
        nodes: [{ id: 'classifier', label: 'classifier', sub: 'session router', accent: 'star' }],
        direction: 'column',
      },
      {
        id: 'tiers',
        title: 'tier lanes',
        nodes: [
          { id: 'passthrough', label: 'system/advisory', sub: 'untouched' },
          { id: 'light', label: 'LIGHT', sub: 'answer directly' },
          { id: 'medium', label: 'MEDIUM', sub: 'delegate work' },
          { id: 'heavy', label: 'HEAVY', sub: 'plan then stop' },
        ],
        direction: 'column',
      },
    ],
    edges: [
      { from: 'prompt', to: 'classifier', style: 'flow' },
      { from: 'classifier', to: 'passthrough', style: 'flow' },
      { from: 'classifier', to: 'light', style: 'flow' },
      { from: 'classifier', to: 'medium', style: 'flow' },
      { from: 'classifier', to: 'heavy', style: 'flow' },
      { from: 'heavy', to: 'plan-gate', style: 'flow' },
      { from: 'classifier', to: 'cred-gate', style: 'orbit', label: 'credential-shaped' },
    ],
    footnote: 'Classification happens at prompt-submit time, before the cost of any decision is spent.',
  },
  'field-rules': {
    id: 'field-rules',
    title: 'The behavioral layer above the hooks',
    groups: [
      {
        id: 'hub',
        nodes: [{ id: 'field-rules', label: 'field rules', sub: 'behavioral layer', accent: 'star' }],
        direction: 'column',
      },
      {
        id: 'before',
        title: 'before execution',
        nodes: [
          { id: 'check-secrets', label: 'check secrets', sub: 'before asking' },
          { id: 'check-burn', label: 'check burn', sub: 'before fan-out' },
        ],
        direction: 'column',
      },
      {
        id: 'during',
        title: 'during execution',
        nodes: [
          { id: 'max-2', label: 'max 2 parallel', sub: 'serialize default' },
          { id: 'sandbox', label: 'sandbox scripts', sub: 'time budget' },
        ],
        direction: 'column',
      },
      {
        id: 'failure',
        title: 'on failure',
        nodes: [
          { id: 'two-strike', label: 'two strike', sub: 'no 3rd retry' },
          { id: 'stuck-rule', label: '10 min stuck', sub: 'report not wait' },
        ],
        direction: 'column',
      },
      {
        id: 'overrides',
        title: 'user overrides',
        nodes: [
          { id: 'pace', label: 'pace override', sub: 'takes effect now' },
          { id: 'inline', label: 'inline order', sub: 'flagged once' },
        ],
        direction: 'column',
      },
    ],
    edges: [
      { from: 'field-rules', to: 'check-secrets', style: 'flow' },
      { from: 'field-rules', to: 'check-burn', style: 'flow' },
      { from: 'field-rules', to: 'max-2', style: 'flow' },
      { from: 'field-rules', to: 'sandbox', style: 'flow' },
      { from: 'field-rules', to: 'two-strike', style: 'flow' },
      { from: 'field-rules', to: 'stuck-rule', style: 'flow' },
      { from: 'field-rules', to: 'pace', style: 'flow' },
      { from: 'field-rules', to: 'inline', style: 'flow' },
    ],
    footnote: 'Hooks catch what a script can detect; these rules encode postmortem lessons that need judgment to apply.',
  },
  'claude-md': {
    id: 'claude-md',
    title: 'Memory as a paging system',
    groups: [
      {
        id: 'core-group',
        nodes: [
          { id: 'core', label: 'lean core', sub: '8k token cap', accent: 'star' },
          { id: 'pointer-map', label: 'memory map', sub: 'pointer table' },
        ],
        direction: 'column',
      },
      {
        id: 'depth',
        title: 'on demand',
        nodes: [
          { id: 'runbooks', label: 'runbooks', sub: 'per system' },
          { id: 'ledgers', label: 'status ledgers', sub: 'project state' },
          { id: 'secrets', label: 'secrets store', sub: 'gitignored' },
        ],
        direction: 'column',
      },
      {
        id: 'skills-group',
        title: 'self-triggering',
        nodes: [{ id: 'skills', label: 'skills', sub: 'match & load' }],
        direction: 'column',
      },
    ],
    edges: [
      { from: 'core', to: 'pointer-map', style: 'flow' },
      { from: 'pointer-map', to: 'runbooks', style: 'flow', label: 'fetch' },
      { from: 'pointer-map', to: 'ledgers', style: 'flow' },
      { from: 'pointer-map', to: 'secrets', style: 'flow' },
      { from: 'skills', to: 'core', style: 'orbit', label: 'self-trigger' },
    ],
    footnote: 'Same idea as paging in operating systems: keep the working set small and fault the rest in on demand.',
  },
  'cost-comparison': {
    id: 'cost-comparison',
    title: 'What the enforcement layer measurably changed',
    gates: [
      { id: 'before-gate', label: 'before: unenforced', kind: 'deny' },
      { id: 'after-gate', label: 'after: enforced', kind: 'limit' },
    ],
    groups: [
      {
        id: 'before',
        title: 'before (jul 25)',
        nodes: [
          { id: 'runaway', label: '$31 runaway', sub: '32 minutes', tone: 'bad' },
          { id: 'cap-burn', label: '36% cap burn', sub: 'one session', tone: 'bad' },
          { id: 'burst-share', label: '81% burst', sub: 'subagent spend', tone: 'bad' },
          { id: 'no-delegate', label: '$27.87 inline', sub: 'conductor did it', tone: 'bad' },
        ],
        direction: 'row',
      },
      {
        id: 'after',
        title: 'after (jul 26+)',
        nodes: [
          { id: 'avg-session', label: '$1.46 avg', sub: 'per session', tone: 'good' },
          { id: 'cap-share', label: '~2% cap', sub: 'per session', tone: 'good' },
          { id: 'no-bursts', label: 'zero bursts', sub: '4+ parallel', tone: 'good' },
          { id: 'gate-held', label: 'gates held', sub: 'every trigger', tone: 'good' },
        ],
        direction: 'row',
      },
      {
        id: 'result',
        nodes: [{ id: 'reduction', label: '~95% cut', sub: 'cost per session', accent: 'star' }],
        direction: 'column',
      },
    ],
    edges: [
      { from: 'runaway', to: 'avg-session', style: 'return', label: 'became' },
      { from: 'cap-burn', to: 'cap-share', style: 'return', label: 'became' },
      { from: 'burst-share', to: 'no-bursts', style: 'return', label: 'became' },
      { from: 'no-delegate', to: 'gate-held', style: 'return', label: 'became' },
      { from: 'avg-session', to: 'reduction', style: 'flow' },
      { from: 'cap-share', to: 'reduction', style: 'flow' },
    ],
    footnote: 'The raw dollar figures stay in the open: "trust me, it\'s cheaper" is exactly the kind of unverifiable claim this design bans internally.',
  },
}
