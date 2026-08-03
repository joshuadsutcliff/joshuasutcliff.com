import { useEffect, useRef } from 'react'

export type ParticleMode = 'constellation' | 'spiral' | 'orbital' | 'nebula' | 'singularity'

interface ParticleFieldProps {
  mode: ParticleMode
}

/**
 * Route-aware cosmic background canvas, mounted once in Layout. One rAF
 * loop, one mode active at a time (constellation / spiral / orbital /
 * nebula / singularity). Pauses when the tab is hidden and renders a
 * single static frame under prefers-reduced-motion. The constellation
 * mode reproduces the original Home particle field unchanged.
 */
export default function ParticleField({ mode }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let width = 0
    let height = 0
    let raf = 0
    let lastTime = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const rootStyles = getComputedStyle(document.documentElement)
    const cyanRgb = rootStyles.getPropertyValue('--cyan-rgb').trim() || '6, 182, 212'
    const purpleRgb = rootStyles.getPropertyValue('--purple-rgb').trim() || '139, 92, 246'
    const cyanParts = cyanRgb.split(',').map((n) => parseFloat(n))
    const purpleParts = purpleRgb.split(',').map((n) => parseFloat(n))
    const baseAlpha = parseFloat(rootStyles.getPropertyValue('--particle-alpha')) || 0.55

    function lerpColor(t: number) {
      const cl = Math.max(0, Math.min(1, t))
      const r = cyanParts[0] + (purpleParts[0] - cyanParts[0]) * cl
      const g = cyanParts[1] + (purpleParts[1] - cyanParts[1]) * cl
      const b = cyanParts[2] + (purpleParts[2] - cyanParts[2]) * cl
      return `${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}`
    }

    // deterministic-ish jitter without a Math.random dependency
    function rand(min: number, max: number) {
      return min + (max - min) * Math.abs(Math.sin((performance.now() + min * 97.3) * 0.0001 + max))
    }

    // deterministic hash in [0, 1); seed advances per index so consecutive
    // particles differ, with no performance.now() term to dominate the mix
    function rand01(seed: number, salt: number) {
      const s = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
      return s - Math.floor(s)
    }

    // ---- constellation state (unchanged from the original Home field) ----
    type Node = { x: number; y: number; vx: number; vy: number }
    let nodes: Node[] = []

    // ---- spiral state ----
    type SpiralP = { r: number; baseAngle: number; t: number; alpha: number }
    let spiralParticles: SpiralP[] = []
    let spiralCenter = { x: 0, y: 0 }
    let spiralRotation = 0

    // ---- orbital state ----
    type OrbitP = { cx: number; cy: number; a: number; b: number; phi: number; theta: number; omega: number }
    let orbitParticles: OrbitP[] = []
    let orbitArcTimer = 0
    let orbitArcNextAt = 0
    let orbitArc: { index: number; start: number; duration: number } | null = null

    // ---- nebula state ----
    type NebulaP = { x: number; y: number; vx: number; vy: number; radius: number; layer: number; hue: number }
    let nebulaParticles: NebulaP[] = []

    // ---- singularity state ----
    type RingP = { angle: number; radiusJitter: number }
    let ringParticles: RingP[] = []
    let ringCenter = { x: 0, y: 0 }
    let ringRadiusX = 0
    let ringRadiusY = 0
    const ringPhi = -0.35
    let ringRotation = 0

    function seedConstellation() {
      const count = Math.min(70, Math.floor((width * height) / 18000))
      nodes = Array.from({ length: count }, (_, i) => ({
        x: rand(i * 13, width),
        y: rand(i * 7, height),
        vx: (rand(i, 1) - 0.5) * 0.25,
        vy: (rand(1, i + 2) - 0.5) * 0.25,
      }))
    }

    function seedSpiral() {
      const armCount = 3
      const total = 70 // spec cap: particle count <= current Home count (70)
      const perArmBase = Math.floor(total / armCount)
      const remainder = total % armCount // distribute so arms sum to exactly `total`
      const thetaMax = Math.PI * 4
      const b = 0.21 // within the 0.18-0.25 range
      const maxRadius = Math.min(width, height) * 0.5
      const a = maxRadius / Math.exp(b * thetaMax)
      spiralCenter = { x: width * 0.64, y: height * 0.32 } // offset toward the top-right third
      spiralRotation = 0
      spiralParticles = []
      for (let arm = 0; arm < armCount; arm++) {
        const armOffset = (arm * Math.PI * 2) / armCount
        const perArm = perArmBase + (arm < remainder ? 1 : 0)
        for (let i = 0; i < perArm; i++) {
          const t = i / perArm
          const jitterAngle = (rand01(arm * 31 + i, 2) - 0.5) * 0.35 // +/-0.175 rad
          const jitterR = (rand01(arm * 17 + i, 3) - 0.5) * 0.12 // +/-6%
          const thetaLocal = t * thetaMax
          const r = a * Math.exp(b * thetaLocal) * (1 + jitterR)
          spiralParticles.push({
            r,
            baseAngle: thetaLocal + armOffset + jitterAngle,
            t,
            alpha: 0.5 - 0.25 * t, // 0.25-0.5 range, brighter toward the core
          })
        }
      }
    }

    function seedOrbital() {
      const attractorCount = 3
      const attractors = Array.from({ length: attractorCount }, (_, i) => ({
        x: width * (0.22 + 0.28 * i + rand01(i, 5) * 0.06),
        y: height * (0.3 + rand01(i + 1, 6) * 0.4),
      }))
      const total = 55 // within the brief's 40-70 range
      const scale = Math.min(width, height)
      orbitParticles = Array.from({ length: total }, (_, i) => {
        const attractor = attractors[i % attractors.length]
        const semiMajor = scale * (0.1 + rand01(i, 7) * 0.18) // ellipse fits the viewport
        return {
          cx: attractor.x,
          cy: attractor.y,
          a: semiMajor,
          b: semiMajor * (0.4 + rand01(i, 8) * 0.4),
          phi: rand01(i, 9) * Math.PI * 2,
          theta: rand01(i, 10) * Math.PI * 2,
          omega: (rand01(i, 11) - 0.5) * 0.25, // slow, mixed-sign
        }
      })
      orbitArcTimer = 0
      orbitArcNextAt = 4 + rand01(1, 12) * 3 // arcs every few seconds
      orbitArc = null
    }

    function seedNebula() {
      const total = 32 // within the brief's 25-40 range
      nebulaParticles = Array.from({ length: total }, (_, i) => {
        const layer = i % 2
        return {
          x: rand01(i, 30) * width,
          y: rand01(i, 31) * height,
          // slow drift, 2-layer parallax. Amplitude here is per-axis max
          // magnitude (rand01()-0.5 centers on 0, so real max is half the
          // multiplier); the old 0.03/0.07 multipliers averaged ~0.018
          // px/frame-equivalent combined speed, ~11px over 10s -- real
          // motion, but at the <=0.05 peak alpha below it rendered under
          // real-display color-management rounding, indistinguishable from
          // static. Raised so displacement clears that floor while staying
          // the gentlest mode (still far under spiral/orbital/singularity).
          vx: (rand01(i, 13) - 0.5) * (layer === 0 ? 0.05 : 0.11),
          vy: (rand01(i + 1, 14) - 0.5) * (layer === 0 ? 0.05 : 0.11),
          radius: 8 + rand01(i, 15) * 16, // 8-24px
          layer,
          hue: rand01(i, 16), // lerps cyan -> purple across 0..1
        }
      })
    }

    function seedSingularity() {
      ringCenter = { x: width * 0.86, y: height * 0.24 } // right edge, upper third, clear of the max-w-5xl column
      const scale = Math.min(width, height)
      ringRadiusX = scale * 0.18
      ringRadiusY = ringRadiusX * 0.32
      const total = 60 // within the brief's 50-70 range
      ringParticles = Array.from({ length: total }, (_, i) => ({
        angle: (i / total) * Math.PI * 2,
        radiusJitter: 1 + (rand01(i, 17) - 0.5) * 0.08, // +/-4%
      }))
      ringRotation = 0
    }

    function seed() {
      if (mode === 'constellation') seedConstellation()
      else if (mode === 'spiral') seedSpiral()
      else if (mode === 'orbital') seedOrbital()
      else if (mode === 'nebula') seedNebula()
      else seedSingularity()
    }

    function resize() {
      width = canvas!.offsetWidth
      height = canvas!.offsetHeight
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      // canvas.width above clears the bitmap; under reduced motion no rAF
      // loop is running to repaint it, so force a single static frame.
      if (reduced) draw(0)
    }

    function drawConstellation() {
      ctx!.clearRect(0, 0, width, height)

      for (const p of nodes) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a1 = nodes[i]
          const b1 = nodes[j]
          const dx = a1.x - b1.x
          const dy = a1.y - b1.y
          const dist = Math.hypot(dx, dy)
          if (dist < 130) {
            const o = (1 - dist / 130) * baseAlpha * 0.5
            ctx!.strokeStyle = `rgba(${cyanRgb}, ${o})`
            ctx!.lineWidth = 1
            ctx!.beginPath()
            ctx!.moveTo(a1.x, a1.y)
            ctx!.lineTo(b1.x, b1.y)
            ctx!.stroke()
          }
        }
      }

      for (const p of nodes) {
        ctx!.fillStyle = `rgba(${cyanRgb}, ${baseAlpha})`
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, 1.4, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function drawSpiral(dt: number) {
      spiralRotation += dt * 0.02 // ~0.02 rad/s
      ctx!.clearRect(0, 0, width, height)
      for (const p of spiralParticles) {
        const angle = p.baseAngle + spiralRotation
        const x = spiralCenter.x + p.r * Math.cos(angle)
        const y = spiralCenter.y + p.r * Math.sin(angle)
        ctx!.fillStyle = `rgba(${lerpColor(p.t)}, ${p.alpha})`
        ctx!.beginPath()
        ctx!.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function drawOrbital(dt: number) {
      ctx!.clearRect(0, 0, width, height)
      orbitArcTimer += dt

      for (const p of orbitParticles) {
        p.theta += p.omega * dt
        const cosT = Math.cos(p.theta)
        const sinT = Math.sin(p.theta)
        const cosPhi = Math.cos(p.phi)
        const sinPhi = Math.sin(p.phi)
        const ex = p.a * cosT
        const ey = p.b * sinT
        const x = p.cx + ex * cosPhi - ey * sinPhi
        const y = p.cy + ex * sinPhi + ey * cosPhi
        ctx!.fillStyle = `rgba(${cyanRgb}, ${baseAlpha * 0.6})`
        ctx!.beginPath()
        ctx!.arc(x, y, 1.3, 0, Math.PI * 2)
        ctx!.fill()
      }

      if (!orbitArc && orbitArcTimer >= orbitArcNextAt) {
        const index = Math.floor(rand01(orbitArcTimer, 20) * orbitParticles.length) % orbitParticles.length
        orbitArc = { index, start: orbitArcTimer, duration: 3 }
      }
      if (orbitArc) {
        const elapsed = orbitArcTimer - orbitArc.start
        const halfDur = orbitArc.duration / 2
        let envelope = elapsed < halfDur ? elapsed / halfDur : 1 - (elapsed - halfDur) / halfDur
        envelope = Math.max(0, Math.min(1, envelope))
        const arcAlpha = envelope * 0.06 // stroke alpha <= 0.06
        const op = orbitParticles[orbitArc.index]
        ctx!.strokeStyle = `rgba(${purpleRgb}, ${arcAlpha})`
        ctx!.lineWidth = 1
        ctx!.beginPath()
        ctx!.ellipse(op.cx, op.cy, op.a, op.b, op.phi, 0, Math.PI * 2)
        ctx!.stroke()
        if (elapsed >= orbitArc.duration) {
          orbitArc = null
          orbitArcTimer = 0
          orbitArcNextAt = 4 + rand01(elapsed, 21) * 3
        }
      }
    }

    function drawNebula(dt: number) {
      ctx!.clearRect(0, 0, width, height)
      const step = dt * 60 // normalize velocities tuned for a ~60fps cadence
      for (const p of nebulaParticles) {
        p.x += p.vx * step
        p.y += p.vy * step
        if (p.x < -p.radius) p.x = width + p.radius
        if (p.x > width + p.radius) p.x = -p.radius
        if (p.y < -p.radius) p.y = height + p.radius
        if (p.y > height + p.radius) p.y = -p.radius

        const color = lerpColor(p.hue)
        const peakAlpha = 0.14 * (p.layer === 0 ? 0.6 : 1) // <= 0.14 per circle, still the gentlest mode
        const gradient = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
        gradient.addColorStop(0, `rgba(${color}, ${peakAlpha})`)
        gradient.addColorStop(1, `rgba(${color}, 0)`)
        ctx!.fillStyle = gradient
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function drawSingularity(dt: number) {
      ringRotation += dt * 0.004 // near-static
      ctx!.clearRect(0, 0, width, height)

      const coreRadius = ringRadiusX * 0.9
      const core = ctx!.createRadialGradient(ringCenter.x, ringCenter.y, 0, ringCenter.x, ringCenter.y, coreRadius)
      core.addColorStop(0, 'rgba(0, 0, 0, 0.35)')
      core.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx!.fillStyle = core
      ctx!.beginPath()
      ctx!.arc(ringCenter.x, ringCenter.y, coreRadius, 0, Math.PI * 2)
      ctx!.fill()

      for (const p of ringParticles) {
        const angle = p.angle + ringRotation
        const ex = ringRadiusX * p.radiusJitter * Math.cos(angle)
        const ey = ringRadiusY * p.radiusJitter * Math.sin(angle)
        const x = ringCenter.x + ex * Math.cos(ringPhi) - ey * Math.sin(ringPhi)
        const y = ringCenter.y + ex * Math.sin(ringPhi) + ey * Math.cos(ringPhi)
        ctx!.fillStyle = `rgba(${cyanRgb}, ${baseAlpha * 0.5})`
        ctx!.beginPath()
        ctx!.arc(x, y, 1, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function draw(dt: number) {
      if (mode === 'constellation') drawConstellation()
      else if (mode === 'spiral') drawSpiral(dt)
      else if (mode === 'orbital') drawOrbital(dt)
      else if (mode === 'nebula') drawNebula(dt)
      else drawSingularity(dt)
    }

    function frame(now: number) {
      // Clamp dt against pathological gaps only (tab asleep for minutes,
      // debugger pause, etc). 1s is generous: rAF delivery is already
      // throttled to roughly 1/s for an occluded-but-visible window (no
      // visibilitychange fires in that case, so lastTime is never reset),
      // and the old 0.1s clamp discarded ~90% of that elapsed real time on
      // every such callback, so motion nearly stalled under exactly the
      // conditions a real screenshot-diff check hits (window not focused
      // during the wait). Genuine hidden -> visible transitions already
      // reset lastTime to 0 in handleVisibility, so they never hit this
      // clamp at all.
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 1) : 0
      lastTime = now
      draw(dt)
      raf = requestAnimationFrame(frame)
    }

    function handleVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (!reduced) {
        lastTime = 0
        raf = requestAnimationFrame(frame)
      }
    }

    resize()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', handleVisibility)

    if (!reduced) {
      raf = requestAnimationFrame(frame)
    } else {
      draw(0) // render one static frame, no loop
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [mode])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 h-full w-full print:hidden"
    />
  )
}
