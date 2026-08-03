import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SchematicGate, SchematicNode, SchematicSpec } from '../content/schematics'

type Point = { x: number; y: number }
type NodeRect = Point & { hw: number; hh: number }

const EDGE_GAP = 3

function quadraticMidpoint(from: Point, control: Point, to: Point): Point {
  return {
    x: 0.25 * from.x + 0.5 * control.x + 0.25 * to.x,
    y: 0.25 * from.y + 0.5 * control.y + 0.25 * to.y,
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

function EdgeLabel({ point, text }: { point: Point; text: string }) {
  const paddingX = 4
  const charWidth = 5.4
  const width = text.length * charWidth + paddingX * 2
  const height = 13
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

function NodeBox({
  node,
  registerRef,
}: {
  node: SchematicNode
  registerRef: (id: string, el: HTMLDivElement | null) => void
}) {
  const isStar = node.accent === 'star'
  return (
    <div
      ref={(el) => registerRef(node.id, el)}
      className="hud-panel relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 text-center"
      style={
        isStar
          ? { boxShadow: '0 0 26px 8px rgba(139, 92, 246, 0.18), inset 0 0 0 1px rgba(6, 182, 212, 0.3)' }
          : undefined
      }
    >
      <span className="font-mono text-xs text-fg">{node.label}</span>
      {node.sub && <span className="font-mono text-[10px] text-dim">{node.sub}</span>}
    </div>
  )
}

function GateChip({
  gate,
  registerRef,
}: {
  gate: SchematicGate
  registerRef: (id: string, el: HTMLDivElement | null) => void
}) {
  const isDeny = gate.kind === 'deny'
  return (
    <div
      ref={(el) => registerRef(gate.id, el)}
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
  const nodeElements = useRef<Map<string, HTMLDivElement>>(new Map())
  const [points, setPoints] = useState<Map<string, NodeRect>>(new Map())
  const [box, setBox] = useState({ width: 0, height: 0 })

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) nodeElements.current.set(id, el)
    else nodeElements.current.delete(id)
  }, [])

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const next = new Map<string, NodeRect>()
    nodeElements.current.forEach((el, id) => {
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
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => measure())
    observer.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, spec])

  const flowCaption = [
    ...(spec.gates ?? []).map((gate) => gate.label),
    ...spec.groups.flatMap((group) => group.nodes.map((node) => node.label)),
  ].join(' > ')

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
              <GateChip key={gate.id} gate={gate} registerRef={registerRef} />
            ))}
          </div>
        )}

        {spec.groups.map((group) => (
          <div key={group.id} className="md:flex-1">
            {group.title && (
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
                {group.title}
              </p>
            )}
            <div className={`flex gap-2 ${group.direction === 'row' ? 'flex-row flex-wrap' : 'flex-col'}`}>
              {group.nodes.map((node) => (
                <NodeBox key={node.id} node={node} registerRef={registerRef} />
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

              if (edge.style === 'orbit') {
                const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 36 }
                // Clip each endpoint toward the control point so the curve
                // visually exits the box edge cleanly (not toward the other
                // node's center, which would clip at the wrong angle for a
                // curved path).
                const clippedFrom = clipToNodeBorder(from, control)
                const clippedTo = clipToNodeBorder(to, control)
                const labelPoint = quadraticMidpoint(clippedFrom, control, clippedTo)
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
                    {edge.label && <EdgeLabel point={labelPoint} text={edge.label} />}
                  </g>
                )
              }

              // Straight edges (flow/return): clip each endpoint toward the
              // other node's raw center so the stroke starts/ends at the box
              // border, never crossing into the box over its label text.
              const clippedFrom = clipToNodeBorder(from, to)
              const clippedTo = clipToNodeBorder(to, from)
              const midPoint = {
                x: (clippedFrom.x + clippedTo.x) / 2,
                y: (clippedFrom.y + clippedTo.y) / 2,
              }

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
                    {edge.label && <EdgeLabel point={midPoint} text={edge.label} />}
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
                  {edge.label && <EdgeLabel point={midPoint} text={edge.label} />}
                </g>
              )
            })}
          </svg>
        )}
      </div>

      <p className="mt-4 font-mono text-[11px] leading-relaxed text-dim md:hidden">flow: {flowCaption}</p>
      {spec.footnote && <p className="mt-3 text-xs leading-relaxed text-dim">{spec.footnote}</p>}
    </div>
  )
}
