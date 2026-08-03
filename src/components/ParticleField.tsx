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
    // baseAngle/t/alpha/core baked at seed; trails are drawn by re-evaluating
    // each particle at the previous two global rotation values (cheap: no
    // per-particle trail buffers, just two extra scalars).
    type SpiralP = { r: number; baseAngle: number; t: number; alpha: number; core: boolean }
    let spiralParticles: SpiralP[] = []
    let spiralCenter = { x: 0, y: 0 }
    let spiralRotation = 0
    let spiralRotationPrev1 = 0
    let spiralRotationPrev2 = 0

    // ---- orbital state ----
    type OrbitP = { cx: number; cy: number; a: number; b: number; phi: number; theta: number; omega: number }
    let orbitParticles: OrbitP[] = []
    let orbitArcTimer = 0
    let orbitArcNextAt = 0
    let orbitArc: { index: number; start: number; duration: number } | null = null

    // ---- nebula state ----
    // spriteIndex picks one of the 2-3 precomputed offscreen puff sprites
    // (built once, tinted, reused every frame via drawImage).
    type NebulaP = {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      layer: number
      spriteIndex: number
    }
    let nebulaParticles: NebulaP[] = []
    let nebulaSprites: HTMLCanvasElement[] = []

    // ---- singularity state ----
    // brightness is baked once from each particle's seed angle (a fixed
    // per-particle angular offset from the bias direction), so the bright
    // side of the ring stays stable in world space as particles orbit
    // through it, without any per-frame trig beyond position.
    type RingP = { angle: number; radiusJitter: number; brightness: number }
    let ringParticles: RingP[] = []
    let ringGlowParticles: RingP[] = []
    let ringCenter = { x: 0, y: 0 }
    let ringRadiusX = 0
    let ringRadiusY = 0
    const ringPhi = -0.35
    const ringBiasAngle = Math.PI * 0.25
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
      const total = 120 // visibly-populated galaxy, within the 100-140 cap
      const perArmBase = Math.floor(total / armCount)
      const remainder = total % armCount // distribute so arms sum to exactly `total`
      const thetaMax = Math.PI * 4
      const b = 0.21 // within the 0.18-0.25 range
      const maxRadius = Math.min(width, height) * 0.5
      const a = maxRadius / Math.exp(b * thetaMax)
      spiralCenter = { x: width * 0.64, y: height * 0.32 } // offset toward the top-right third
      spiralRotation = 0
      spiralRotationPrev1 = 0
      spiralRotationPrev2 = 0
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
          // the first couple of particles per arm sit nearest the core;
          // reading them brighter than the rest sells the galaxy-core look
          const core = i < 2
          spiralParticles.push({
            r,
            baseAngle: thetaLocal + armOffset + jitterAngle,
            t,
            // ceiling is baseAlpha (constellation's own particle alpha) --
            // presence comes from motion/structure, not exceeding Home's
            // brightness. Core particles touch the ceiling; arm particles
            // stay dimmer than it, brighter near the core via t.
            alpha: core ? baseAlpha : baseAlpha * (0.75 - 0.35 * t),
            core,
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
      const total = 75 // within the brief's 60-90 range
      const scale = Math.min(width, height)
      const semiMajorMin = scale * 0.1
      const semiMajorSpan = scale * 0.18 // semiMajor ranges [min, min+span]
      orbitParticles = Array.from({ length: total }, (_, i) => {
        const attractor = attractors[i % attractors.length]
        const semiMajor = semiMajorMin + semiMajorSpan * rand01(i, 7) // ellipse fits the viewport
        // proportional scheme: smaller ellipses orbit faster (up to ~0.25
        // rad/s), larger ones slower, like inner vs outer orbits
        const sizeFrac = (semiMajor - semiMajorMin) / semiMajorSpan // 0 = smallest, 1 = largest
        const omegaMag = 0.25 - 0.17 * sizeFrac
        const omegaSign = rand01(i, 11) < 0.5 ? -1 : 1
        return {
          cx: attractor.x,
          cy: attractor.y,
          a: semiMajor,
          b: semiMajor * (0.4 + rand01(i, 8) * 0.4),
          phi: rand01(i, 9) * Math.PI * 2,
          theta: rand01(i, 10) * Math.PI * 2,
          omega: omegaSign * omegaMag,
        }
      })
      orbitArcTimer = 0
      orbitArcNextAt = 3 + rand01(1, 12) * 3 // pulse every ~3-6s
      orbitArc = null
    }

    // Build the 2-3 offscreen puff sprites once (radial gradient baked to a
    // small canvas at seed/init time). The per-frame render loop only ever
    // calls drawImage against these -- no createRadialGradient per puff per
    // frame.
    function buildNebulaSprites() {
      const size = 64
      const tints = [0, 0.5, 1] // cyan, mid-blend, purple
      nebulaSprites = tints.map((t) => {
        const sprite = document.createElement('canvas')
        sprite.width = size
        sprite.height = size
        const sctx = sprite.getContext('2d')!
        const color = lerpColor(t)
        const gradient = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
        gradient.addColorStop(0, `rgba(${color}, 1)`)
        gradient.addColorStop(1, `rgba(${color}, 0)`)
        sctx.fillStyle = gradient
        sctx.beginPath()
        sctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        sctx.fill()
        return sprite
      })
    }

    function seedNebula() {
      const total = 48 // within the brief's 40-55 range
      nebulaParticles = Array.from({ length: total }, (_, i) => {
        const layer = i % 2
        const hue = rand01(i, 16) // lerps cyan -> purple across 0..1
        return {
          x: rand01(i, 30) * width,
          y: rand01(i, 31) * height,
          // slow drift, 2-layer parallax. Amplitude here is per-axis max
          // magnitude (rand01()-0.5 centers on 0, so real max is half the
          // multiplier). Roughly 3x the prior 0.05/0.11 multipliers so
          // drift reads as clearly visible motion within a few seconds,
          // while staying the gentlest mode (still under spiral/orbital/
          // singularity).
          vx: (rand01(i, 13) - 0.5) * (layer === 0 ? 0.16 : 0.35),
          vy: (rand01(i + 1, 14) - 0.5) * (layer === 0 ? 0.16 : 0.35),
          radius: 10 + rand01(i, 15) * 20, // 10-30px
          layer,
          spriteIndex: Math.min(2, Math.round(hue * 2)),
        }
      })
    }

    function seedSingularity() {
      // scale/reposition for narrow viewports, same proportional-layout
      // pattern the other modes already use (fractions of width/height)
      const narrow = width < 640
      ringCenter = narrow
        ? { x: width * 0.78, y: height * 0.14 } // pulled in and up, clear of stacked mobile content
        : { x: width * 0.86, y: height * 0.24 } // right edge, upper third, clear of the max-w-5xl column
      const scale = Math.min(width, height)
      ringRadiusX = scale * (narrow ? 0.14 : 0.2)
      ringRadiusY = ringRadiusX * 0.32
      const total = 90 // within the brief's 80-100 range
      ringParticles = Array.from({ length: total }, (_, i) => {
        const angle = (i / total) * Math.PI * 2
        return {
          angle,
          radiusJitter: 1 + (rand01(i, 17) - 0.5) * 0.08, // tight +/-4% radial jitter
          // brightness asymmetry baked once from the seed angle so the
          // bright side is a fixed offset that rotates with the ring. Kept
          // moderate (below baseAlpha, Home's own particle ceiling) -- a
          // subtle shading across the ring, not a glaring hot spot.
          brightness: baseAlpha * (0.6 + 0.25 * Math.cos(angle - ringBiasAngle)),
        }
      })
      ringGlowParticles = Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2 + rand01(i, 18) * 0.1
        return {
          angle,
          radiusJitter: 1 + (rand01(i, 19) - 0.5) * 0.3, // looser jitter, sparser outer glow
          brightness: baseAlpha * (0.6 + 0.25 * Math.cos(angle - ringBiasAngle)) * 0.35,
        }
      })
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
      // ~0.07-0.1 rad/s -> a full revolution roughly every 60-90s
      spiralRotationPrev2 = spiralRotationPrev1
      spiralRotationPrev1 = spiralRotation
      spiralRotation += dt * 0.085
      ctx!.clearRect(0, 0, width, height)
      for (const p of spiralParticles) {
        const size = p.core ? 2.4 : 1.5
        const color = lerpColor(p.t)

        // two short, fading trail positions (previous rotation values),
        // then the current position -- plain arc draws, decreasing alpha
        let angle = p.baseAngle + spiralRotationPrev2
        let x = spiralCenter.x + p.r * Math.cos(angle)
        let y = spiralCenter.y + p.r * Math.sin(angle)
        ctx!.fillStyle = `rgba(${color}, ${p.alpha * 0.18})`
        ctx!.beginPath()
        ctx!.arc(x, y, size, 0, Math.PI * 2)
        ctx!.fill()

        angle = p.baseAngle + spiralRotationPrev1
        x = spiralCenter.x + p.r * Math.cos(angle)
        y = spiralCenter.y + p.r * Math.sin(angle)
        ctx!.fillStyle = `rgba(${color}, ${p.alpha * 0.4})`
        ctx!.beginPath()
        ctx!.arc(x, y, size, 0, Math.PI * 2)
        ctx!.fill()

        angle = p.baseAngle + spiralRotation
        x = spiralCenter.x + p.r * Math.cos(angle)
        y = spiralCenter.y + p.r * Math.sin(angle)
        ctx!.fillStyle = `rgba(${color}, ${p.alpha})`
        ctx!.beginPath()
        ctx!.arc(x, y, size, 0, Math.PI * 2)
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
        const arcAlpha = envelope * 0.12 // pulse peak, still far under baseAlpha
        const op = orbitParticles[orbitArc.index]
        ctx!.strokeStyle = `rgba(${purpleRgb}, ${arcAlpha})`
        ctx!.lineWidth = 1
        ctx!.beginPath()
        ctx!.ellipse(op.cx, op.cy, op.a, op.b, op.phi, 0, Math.PI * 2)
        ctx!.stroke()
        if (elapsed >= orbitArc.duration) {
          orbitArc = null
          orbitArcTimer = 0
          orbitArcNextAt = 3 + rand01(elapsed, 21) * 3 // next pulse in ~3-6s
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

        // <= 0.22 per puff (still the gentlest mode, well under the
        // constellation-particle ceiling); no per-frame gradient
        // construction -- draw the precomputed sprite, tinted via alpha
        const peakAlpha = 0.22 * (p.layer === 0 ? 0.6 : 1)
        ctx!.globalAlpha = peakAlpha
        const sprite = nebulaSprites[p.spriteIndex]
        ctx!.drawImage(sprite, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2)
      }
      ctx!.globalAlpha = 1
    }

    function drawSingularity(dt: number) {
      ringRotation += dt * 0.12 // ~0.1-0.15 rad/s, rotation clearly visible
      ctx!.clearRect(0, 0, width, height)

      // dark core: a real void at the ring's center, no particles inside
      // it. Sized under the ring's minor-axis extent (ringRadiusY, its
      // tightest constraint) so it never covers ring particles. Plain
      // filled circle -- no gradient, so nothing is built here per frame.
      const coreRadius = ringRadiusY * 0.72
      ctx!.fillStyle = 'rgba(4, 6, 14, 0.9)'
      ctx!.beginPath()
      ctx!.arc(ringCenter.x, ringCenter.y, coreRadius, 0, Math.PI * 2)
      ctx!.fill()

      // soft outer glow: sparser, dimmer, slightly larger ellipse than the
      // main ring -- drawn first so the bright ring sits on top of it
      for (const p of ringGlowParticles) {
        const angle = p.angle + ringRotation
        const ex = ringRadiusX * 1.35 * p.radiusJitter * Math.cos(angle)
        const ey = ringRadiusY * 1.35 * p.radiusJitter * Math.sin(angle)
        const x = ringCenter.x + ex * Math.cos(ringPhi) - ey * Math.sin(ringPhi)
        const y = ringCenter.y + ex * Math.sin(ringPhi) + ey * Math.cos(ringPhi)
        ctx!.fillStyle = `rgba(${cyanRgb}, ${p.brightness})`
        ctx!.beginPath()
        ctx!.arc(x, y, 1, 0, Math.PI * 2)
        ctx!.fill()
      }

      // thin, tight accretion ring. Each particle's brightness was baked at
      // seed time from its angular offset to the bias direction, so the
      // asymmetry (mild shading, not a hot spot) rotates naturally with the
      // ring at zero extra per-frame trig.
      for (const p of ringParticles) {
        const angle = p.angle + ringRotation
        const ex = ringRadiusX * p.radiusJitter * Math.cos(angle)
        const ey = ringRadiusY * p.radiusJitter * Math.sin(angle)
        const x = ringCenter.x + ex * Math.cos(ringPhi) - ey * Math.sin(ringPhi)
        const y = ringCenter.y + ex * Math.sin(ringPhi) + ey * Math.cos(ringPhi)
        ctx!.fillStyle = `rgba(${cyanRgb}, ${p.brightness})`
        ctx!.beginPath()
        ctx!.arc(x, y, 1.2, 0, Math.PI * 2)
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

    if (mode === 'nebula') buildNebulaSprites() // once per mount, resolution-independent
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
