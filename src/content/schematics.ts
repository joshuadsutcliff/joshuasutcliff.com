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
}
