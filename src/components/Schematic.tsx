import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SchematicGate, SchematicNode, SchematicSpec } from '../content/schematics'

type Point = { x: number; y: number }
type NodeRect = Point & { hw: number; hh: number }

const EDGE_GAP = 3
const LABEL_CHAR_WIDTH = 5.4
const LABEL_PADDING_X = 4
const LABEL_HEIGHT = 13

function measureLabel(text: string): { width: number; height: number } {
  return { width: text.length * LABEL_CHAR_WIDTH + LABEL_PADDING_X * 2, height: LABEL_HEIGHT }
}

function lerp(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
}

function quadraticPoint(from: Point, control: Point, to: Point, t: number): Point {
  const mt = 1 - t
  return {
    x: mt * mt * from.x + 2 * mt * t * control.x + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * control.y + t * t * to.y,
  }
}

// Clips the point where a ray from a node's center toward `toward` exits the
// node's bounding box, then nudges it outward by `gap` so no stroke ever
// enters the box (and crosses its label text).
function clipToNodeBorder(node: NodeRect, toward: Point, gap: number = EDGE_GAP): Point {
  const dx = toward.x - node.x
  const dy = toward.y - node.y
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y }

  const scaleX = dx !== 0 ? node.hw / Math.abs(dx) : Infinity
  const scaleY = dy !== 0 ? node.hh / Math.abs(dy) : Infinity
  const s = Math.min(scaleX, scaleY)

  const length = Math.sqrt(dx * dx + dy * dy)
  const ux = dx / length
  const uy = dy / length

  return {
    x: node.x + dx * s + ux * gap,
    y: node.y + dy * s + uy * gap,
  }
}

// True if point p (with an optional padding radius) falls inside rect.
function pointInRect(p: Point, rect: NodeRect, padding = 0): boolean {
  return (
    p.x >= rect.x - rect.hw - padding &&
    p.x <= rect.x + rect.hw + padding &&
    p.y >= rect.y - rect.hh - padding &&
    p.y <= rect.y + rect.hh + padding
  )
}

// AABB overlap test between a center+half-extent box (e.g. a label pill) and
// a node's bounding rect.
function boxIntersectsRect(center: Point, halfW: number, halfH: number, rect: NodeRect, padding = 0): boolean {
  return (
    Math.abs(center.x - rect.x) < halfW + rect.hw + padding &&
    Math.abs(center.y - rect.y) < halfH + rect.hh + padding
  )
}

// Orbit control point: base lift scales with the endpoints' horizontal
// distance, then increases (capped) until the curve's midpoint region
// clears every other node's bounding box.
function computeOrbitControl(
  from: Point,
  to: Point,
  rects: Map<string, NodeRect>,
  excludeIds: Set<string>,
): Point {
  const controlX = (from.x + to.x) / 2
  const baseY = Math.min(from.y, to.y)
  const dx = Math.abs(to.x - from.x)
  const maxLift = 80
  const step = 14
  let lift = Math.min(maxLift, Math.max(28, dx * 0.18))

  const sampleTs = [0.3, 0.4, 0.5, 0.6, 0.7]
  const entries = Array.from(rects.entries()).filter(([id]) => !excludeIds.has(id))

  for (let attempt = 0; attempt < 6; attempt++) {
    const control = { x: controlX, y: baseY - lift }
    const clashes = entries.some(([, rect]) =>
      sampleTs.some((t) => pointInRect(quadraticPoint(from, control, to, t), rect, 12)),
    )
    if (!clashes || lift >= maxLift) return control
    lift = Math.min(maxLift, lift + step)
  }
  return { x: controlX, y: baseY - lift }
}

// Picks a point along the edge's path (straight or curved, via `pathPoint`)
// for the label to sit at, preferring the midpoint but shifting toward
// t=0.35/0.65 (then further out) whenever the label pill would overlap
// another node's box.
function resolveLabelAnchor(
  pathPoint: (t: number) => Point,
  labelSize: { width: number; height: number },
  rects: Map<string, NodeRect>,
  excludeIds: Set<string>,
): Point {
  const entries = Array.from(rects.entries()).filter(([id]) => !excludeIds.has(id))
  const isClear = (p: Point) => {
    const pillCenter = { x: p.x, y: p.y - 10 }
    return entries.every(
      ([, rect]) => !boxIntersectsRect(pillCenter, labelSize.width / 2, labelSize.height / 2, rect, 6),
    )
  }

  for (const t of [0.5, 0.35, 0.65, 0.25, 0.75]) {
    const candidate = pathPoint(t)
    if (isClear(candidate)) return candidate
  }

  const base = pathPoint(0.5)
  for (let extra = 14; extra <= 60; extra += 14) {
    const candidate = { x: base.x, y: base.y - extra }
    if (isClear(candidate)) return candidate
  }
  return base
}

// Builds the mobile/screen-reader caption from the graph itself rather than
// DOM order: walks the 'flow'-style edges from whichever node(s) have no
// incoming flow edge. field-rules and cost-comparison are hub/comparison
// layouts, not pipelines, so a linear "a > b > c" caption would misstate
// them; those two list their group titles instead.
function deriveCaption(spec: SchematicSpec): string {
  const isNonFlow = spec.id === 'field-rules' || spec.id === 'cost-comparison'
  if (isNonFlow) {
    const titles = spec.groups.map((group) => group.title ?? group.nodes[0]?.label ?? group.id).filter(Boolean)
    return `groups: ${titles.join(', ')}`
  }

  const labels = new Map<string, string>()
  ;(spec.gates ?? []).forEach((gate) => labels.set(gate.id, gate.label))
  spec.groups.forEach((group) => group.nodes.forEach((node) => labels.set(node.id, node.label)))

  const flowEdges = spec.edges.filter((edge) => (edge.style ?? 'flow') === 'flow')
  const hasIncoming = new Set(flowEdges.map((edge) => edge.to))
  const adjacency = new Map<string, string[]>()
  flowEdges.forEach((edge) => {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
    adjacency.get(edge.from)!.push(edge.to)
  })

  const roots = Array.from(labels.keys()).filter((id) => adjacency.has(id) && !hasIncoming.has(id))
  const visited = new Set<string>()
  const order: string[] = []
  const queue = [...roots]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    order.push(id)
    for (const next of adjacency.get(id) ?? []) {
      if (!visited.has(next)) queue.push(next)
    }
  }

  return `flow: ${order.map((id) => labels.get(id)).join(' > ')}`
}

function EdgeLabel({ point, text }: { point: Point; text: string }) {
  const { width, height } = measureLabel(text)
  return (
    <g transform={`translate(${point.x}, ${point.y - 10})`}>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={3}
        fill="var(--bg)"
        opacity={0.82}
      />
      <text
        className="font-mono"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
        fill="var(--dim)"
      >
        {text}
      </text>
    </g>
  )
}

const STYLE_ID = 'schematic-inline-styles'
const STYLES = `
@keyframes schematic-dash-flow { to { stroke-dashoffset: -24; } }
@keyframes schematic-dash-orbit { to { stroke-dashoffset: -36; } }
.schematic-edge-flow { animation: schematic-dash-flow 1.6s linear infinite; }
.schematic-edge-orbit { animation: schematic-dash-orbit 2.6s linear infinite; }
`

function useInjectedStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = STYLES
    document.head.appendChild(style)
  }, [])
}

function NodeBox({ node }: { node: SchematicNode }) {
  const isStar = node.accent === 'star'
  const toneRgb = node.tone === 'bad' ? '239, 68, 68' : node.tone === 'good' ? '34, 197, 94' : null
  const style = isStar
    ? { boxShadow: '0 0 26px 8px rgba(139, 92, 246, 0.18), inset 0 0 0 1px rgba(6, 182, 212, 0.3)' }
    : toneRgb
      ? { boxShadow: `inset 0 0 0 1px rgba(${toneRgb}, 0.35)` }
      : undefined
  return (
    <div
      data-schematic-id={node.id}
      className="hud-panel relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-center"
      style={style}
    >
      <span className="font-mono text-xs text-fg">{node.label}</span>
      {node.sub && <span className="font-mono text-[10px] text-dim">{node.sub}</span>}
    </div>
  )
}

function GateChip({ gate }: { gate: SchematicGate }) {
  const isDeny = gate.kind === 'deny'
  return (
    <div
      data-schematic-id={gate.id}
      className="flex items-center gap-2 rounded-full border border-border bg-bg2/60 px-3 py-1.5"
    >
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 shrink-0 rounded-full"
        style={{
          border: `1px solid ${isDeny ? 'rgba(245, 158, 11, 0.6)' : 'rgba(107, 122, 146, 0.5)'}`,
          background: isDeny
            ? 'radial-gradient(circle, #050608 40%, rgba(245, 158, 11, 0.22) 100%)'
            : 'radial-gradient(circle, #050608 40%, rgba(107, 122, 146, 0.18) 100%)',
        }}
      />
      <span className="font-mono text-[11px] text-muted">{gate.label}</span>
    </div>
  )
}

export default function Schematic({ spec }: { spec: SchematicSpec }) {
  useInjectedStyles()

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [points, setPoints] = useState<Map<string, NodeRect>>(new Map())
  const [box, setBox] = useState({ width: 0, height: 0 })

  // Node/gate/group-title rects are read straight off the DOM via a data
  // attribute instead of per-id ref callbacks, so nothing recreates a
  // closure (and re-fires the ref) on every render.
  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const next = new Map<string, NodeRect>()
    container.querySelectorAll<HTMLElement>('[data-schematic-id]').forEach((el) => {
      const id = el.dataset.schematicId
      if (!id) return
      const rect = el.getBoundingClientRect()
      next.set(id, {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
        hw: rect.width / 2,
        hh: rect.height / 2,
      })
    })
    setPoints(next)
    setBox({ width: containerRect.width, height: containerRect.height })
  }, [])

  useLayoutEffect(() => {
    measure()
    const container = containerRef.current
    // A ResizeObserver on the container already catches window-resize-driven
    // layout changes (the container's own box changes size); no separate
    // window 'resize' listener is needed.
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(container)
    return () => {
      observer.disconnect()
    }
  }, [measure, spec])

  const caption = deriveCaption(spec)

  return (
    <div className="hud-panel rounded-2xl p-5 sm:p-6">
      <p className="hud-eyebrow">{spec.title}</p>

      <div
        ref={containerRef}
        className="relative mt-4 flex flex-col gap-6 md:flex-row md:items-center md:gap-8"
      >
        {spec.gates && spec.gates.length > 0 && (
          <div className="flex flex-row flex-wrap gap-2 md:flex-col md:flex-nowrap md:gap-3">
            {spec.gates.map((gate) => (
              <GateChip key={gate.id} gate={gate} />
            ))}
          </div>
        )}

        {spec.groups.map((group) => (
          <div key={group.id} className="md:flex-1">
            {group.title && (
              <p
                data-schematic-id={`${group.id}-title`}
                className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-dim"
              >
                {group.title}
              </p>
            )}
            <div className={`flex gap-2 ${group.direction === 'row' ? 'flex-row flex-wrap' : 'flex-col'}`}>
              {group.nodes.map((node) => (
                <NodeBox key={node.id} node={node} />
              ))}
            </div>
          </div>
        ))}

        {box.width > 0 && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden md:block"
            width={box.width}
            height={box.height}
            viewBox={`0 0 ${box.width} ${box.height}`}
          >
            {spec.edges.map((edge, index) => {
              const from = points.get(edge.from)
              const to = points.get(edge.to)
              if (!from || !to) return null

              const excludeIds = new Set([edge.from, edge.to])

              if (edge.style === 'orbit') {
                // Base lift scales with horizontal distance, then grows
                // (capped at 80px) until the curve clears any intervening
                // node boxes (e.g. a worker-pool column sitting between the
                // conductor and the vault).
                const control = computeOrbitControl(from, to, points, excludeIds)
                // Clip each endpoint toward the control point so the curve
                // visually exits the box edge cleanly (not toward the other
                // node's center, which would clip at the wrong angle for a
                // curved path).
                const clippedFrom = clipToNodeBorder(from, control)
                const clippedTo = clipToNodeBorder(to, control)
                const labelSize = edge.label ? measureLabel(edge.label) : null
                const labelPoint = labelSize
                  ? resolveLabelAnchor(
                      (t) => quadraticPoint(clippedFrom, control, clippedTo, t),
                      labelSize,
                      points,
                      excludeIds,
                    )
                  : null
                return (
                  <g key={index}>
                    <path
                      d={`M ${clippedFrom.x} ${clippedFrom.y} Q ${control.x} ${control.y} ${clippedTo.x} ${clippedTo.y}`}
                      fill="none"
                      stroke="var(--purple)"
                      strokeWidth={1.25}
                      strokeDasharray="2 6"
                      strokeLinecap="round"
                      opacity={0.55}
                      className="schematic-edge-orbit"
                    />
                    {edge.label && labelPoint && <EdgeLabel point={labelPoint} text={edge.label} />}
                  </g>
                )
              }

              // Straight edges (flow/return): clip each endpoint toward the
              // other node's raw center so the stroke starts/ends at the box
              // border, never crossing into the box over its label text.
              const clippedFrom = clipToNodeBorder(from, to)
              const clippedTo = clipToNodeBorder(to, from)
              const labelSize = edge.label ? measureLabel(edge.label) : null
              const labelPoint = labelSize
                ? resolveLabelAnchor((t) => lerp(clippedFrom, clippedTo, t), labelSize, points, excludeIds)
                : null

              if (edge.style === 'return') {
                return (
                  <g key={index}>
                    <line
                      x1={clippedFrom.x}
                      y1={clippedFrom.y}
                      x2={clippedTo.x}
                      y2={clippedTo.y}
                      stroke="var(--dim)"
                      strokeWidth={1}
                      strokeDasharray="1 5"
                      strokeLinecap="round"
                      opacity={0.6}
                    />
                    {edge.label && labelPoint && <EdgeLabel point={labelPoint} text={edge.label} />}
                  </g>
                )
              }

              return (
                <g key={index}>
                  <line
                    x1={clippedFrom.x}
                    y1={clippedFrom.y}
                    x2={clippedTo.x}
                    y2={clippedTo.y}
                    stroke="var(--cyan)"
                    strokeWidth={1.25}
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    opacity={0.75}
                    className="schematic-edge-flow"
                  />
                  {edge.label && labelPoint && <EdgeLabel point={labelPoint} text={edge.label} />}
                </g>
              )
            })}
          </svg>
        )}
      </div>

      <p className="mt-4 font-mono text-[11px] leading-relaxed text-dim md:sr-only">{caption}</p>
      {spec.footnote && <p className="mt-3 text-xs leading-relaxed text-dim">{spec.footnote}</p>}
    </div>
  )
}
