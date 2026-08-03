export type SchematicNode = { id: string; label: string; sub?: string; accent?: 'star' | 'none' }
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
}
