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
    const mixRgb = (t: number) => {
      const r = cyanParts[0] + (purpleParts[0] - cyanParts[0]) * t
      const g = cyanParts[1] + (purpleParts[1] - cyanParts[1]) * t
      const b = cyanParts[2] + (purpleParts[2] - cyanParts[2]) * t
      return `${r}, ${g}, ${b}`
    }
    // painted-band geometry for the singularity front disk (near side): each
    // band is a stroked, segmented ellipse ribbon drawn UNDER the existing
    // disk particles so the disk reads as continuous light, not dot-spray.
    const frontDiskBands = [
      { rMid: 1.55, flatten: 0.11, lineWidth: 26, blur: 26, alpha: 0.55, colorRgb: mixRgb(0) },
      { rMid: 2.05, flatten: 0.12, lineWidth: 20, blur: 22, alpha: 0.42, colorRgb: mixRgb(0.25) },
      { rMid: 2.55, flatten: 0.14, lineWidth: 15, blur: 18, alpha: 0.32, colorRgb: mixRgb(0.55) },
      { rMid: 3.0, flatten: 0.16, lineWidth: 10, blur: 15, alpha: 0.22, colorRgb: mixRgb(0.85) },
    ]
    // painted-band geometry for the lensed far-side halo (folded up over,
    // and faintly under, the shadow), rNorm mirrors the diskParticles
    // radial normalization used in the halo particle pass below.
    const haloBands = [
      { rNorm: 0.05, lineWidth: 18, blur: 22, alpha: 0.45, colorRgb: mixRgb(0.1) },
      { rNorm: 0.35, lineWidth: 14, blur: 18, alpha: 0.36, colorRgb: mixRgb(0.35) },
      { rNorm: 0.65, lineWidth: 11, blur: 15, alpha: 0.28, colorRgb: mixRgb(0.6) },
      { rNorm: 0.9, lineWidth: 8, blur: 12, alpha: 0.2, colorRgb: mixRgb(0.85) },
    ]

    function lerpColor(t: number) {
      const cl = Math.max(0, Math.min(1, t))
      const r = cyanParts[0] + (purpleParts[0] - cyanParts[0]) * cl
      const g = cyanParts[1] + (purpleParts[1] - cyanParts[1]) * cl
      const b = cyanParts[2] + (purpleParts[2] - cyanParts[2]) * cl
      return `${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)}`
    }

    // purple pushed toward magenta by boosting red slightly beyond the
    // cyan/purple lerp range, for haze color variety
    function lerpMagentaHint() {
      const r = Math.min(255, purpleParts[0] * 1.25)
      const g = purpleParts[1] * 0.7
      const b = Math.min(255, purpleParts[2] * 1.05)
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
    // prevTheta1/2 give each particle a cheap 3-segment fading tail (same
    // technique as the spiral trails: re-evaluate position at the last two
    // theta values instead of keeping a position buffer).
    type OrbitP = {
      cx: number
      cy: number
      a: number
      b: number
      phi: number
      theta: number
      omega: number
      prevTheta1: number
      prevTheta2: number
    }
    let orbitParticles: OrbitP[] = []
    let orbitAttractors: { x: number; y: number }[] = []
    let orbitArcTimer = 0
    let orbitArcNextAt = 0
    let orbitArc: { index: number; start: number; duration: number } | null = null

    // ---- nebula state ----
    // spriteIndex picks one of the 2-3 precomputed offscreen puff sprites
    // (built once, tinted, reused every frame via drawImage). Foreground
    // stars are sharp arcs drawn directly (no sprite needed at 1-2px);
    // background haze reuses the puff sprites at large size/low alpha.
    type NebulaStar = {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      alphaMul: number
      twinkleSeed: number
      twinklePeriod: number
    }
    type NebulaHaze = {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      spriteIndex: number
    }
    type ShootingStar = {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      duration: number
    }
    let nebulaStars: NebulaStar[] = []
    let nebulaHaze: NebulaHaze[] = []
    let nebulaSprites: HTMLCanvasElement[] = []
    let shootingStars: ShootingStar[] = []
    let shootingStarTimer = 0
    let shootingStarNextAt = 0

    // ---- spiral haze state (milky-way arm cloud, behind the particles) ----
    type SpiralHaze = { r: number; baseAngle: number; radius: number; spriteIndex: number }
    let spiralHaze: SpiralHaze[] = []
    let spiralCoreSprite: HTMLCanvasElement | null = null

    // ---- singularity state ----
    // Cinematic black hole: a dense elliptical accretion-disk particle band
    // with Keplerian motion (inner particles orbit faster) and a doppler
    // brightness bias toward the "approaching" side, a bright continuous
    // stroked photon ring, a faint lensed top arc, a dark event-horizon
    // core, and dim ambient background stars so the rest of the page isn't
    // empty.
    type DiskP = { angle: number; radiusJitter: number; omega: number; size: number; shimmerSeed: number; band: number }
    let diskParticles: DiskP[] = []
    let ambientStars: { x: number; y: number; vx: number; vy: number }[] = []
    let singularityCenter = { x: 0, y: 0 }
    // photonRadiusX/Y describe the thin, nearly-circular photon ring that
    // hugs the shadow. shadowRadius (Rs) is the dark core radius that all
    // other singularity geometry (disk bands, lensed halo) is derived from.
    let photonRadiusX = 0
    let photonRadiusY = 0
    let shadowRadius = 0
    let bandFlatten: number[] = []
    // approaching (doppler-bright) side points left, matching the reference
    const singularityBiasAngle = Math.PI

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
      const total = 280 // more content, within the 200-280 spec range
      const perArmBase = Math.floor(total / armCount)
      const remainder = total % armCount // distribute so arms sum to exactly `total`
      const thetaMax = Math.PI * 4
      const b = 0.21 // within the 0.18-0.25 range
      const maxRadius = Math.min(width, height) * 0.5 * 1.45 // ~1.45x scale, fills more of the viewport
      const a = maxRadius / Math.exp(b * thetaMax)
      spiralCenter = { x: width * 0.52, y: height * 0.42 } // recentered, near-center
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
            // stay dimmer than it, floor raised to 0.5x baseAlpha so the
            // outer arms still read clearly next to the haze cloud.
            alpha: core ? baseAlpha : baseAlpha * Math.max(0.5, 0.75 - 0.35 * t),
            core,
          })
        }
      }

      // milky-way haze puffs sampled along the same log-spiral formula,
      // jittered, drawn behind the particles -- forms the cloud-arm look.
      const hazeCount = 56 // more numerous, brighter arms
      spiralHaze = Array.from({ length: hazeCount }, (_, i) => {
        const arm = i % armCount
        const armOffset = (arm * Math.PI * 2) / armCount
        const t = rand01(i, 41)
        const thetaLocal = t * thetaMax
        const jitterAngle = (rand01(arm * 13 + i, 42) - 0.5) * 0.4
        const jitterR = (rand01(arm * 19 + i, 43) - 0.5) * 0.15
        const r = a * Math.exp(b * thetaLocal) * (1 + jitterR)
        return {
          r,
          baseAngle: thetaLocal + armOffset + jitterAngle,
          radius: 40 + rand01(i, 44) * 50, // 40-90px
          spriteIndex: Math.min(4, Math.round(rand01(i, 45) * 4)),
        }
      })
    }

    function seedOrbital() {
      const attractorCount = 4
      orbitAttractors = Array.from({ length: attractorCount }, (_, i) => ({
        x: width * (0.14 + (0.72 / (attractorCount - 1)) * i + (rand01(i, 5) - 0.5) * 0.06),
        y: height * (0.2 + rand01(i + 1, 6) * 0.6),
      }))
      const total = 90 // upper end of the brief's 60-90 range, spread over 4 attractors
      const scale = Math.min(width, height)
      const semiMajorMin = scale * 0.1
      const semiMajorSpan = scale * 0.26 // enlarged orbit radii range, covers more of the page
      orbitParticles = Array.from({ length: total }, (_, i) => {
        const attractor = orbitAttractors[i % orbitAttractors.length]
        const semiMajor = semiMajorMin + semiMajorSpan * rand01(i, 7) // ellipse fits the viewport
        // proportional scheme: smaller ellipses orbit faster (up to ~0.25
        // rad/s), larger ones slower, like inner vs outer orbits
        const sizeFrac = (semiMajor - semiMajorMin) / semiMajorSpan // 0 = smallest, 1 = largest
        const omegaMag = 0.25 - 0.17 * sizeFrac
        const omegaSign = rand01(i, 11) < 0.5 ? -1 : 1
        const theta0 = rand01(i, 10) * Math.PI * 2
        return {
          cx: attractor.x,
          cy: attractor.y,
          a: semiMajor,
          b: semiMajor * (0.4 + rand01(i, 8) * 0.4),
          phi: rand01(i, 9) * Math.PI * 2,
          theta: theta0,
          omega: omegaSign * omegaMag,
          prevTheta1: theta0,
          prevTheta2: theta0,
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
      // sized for the largest use (spiral/nebula haze puffs up to 180px
      // radius / 360px draw diameter) so upscaling never looks blocky
      const size = 256
      // cyan -> teal -> purple -> magenta-hint, richer variety than a plain
      // 2-stop lerp: the last stop nudges slightly warmer/pinker than pure
      // purple by mixing in a touch of extra red/blue.
      const tints = [0, 0.35, 0.6, 1, 'magenta'] as const
      nebulaSprites = tints.map((t) => {
        const sprite = document.createElement('canvas')
        sprite.width = size
        sprite.height = size
        const sctx = sprite.getContext('2d')!
        const color = t === 'magenta' ? lerpMagentaHint() : lerpColor(t)
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

    // warm-white/cyan galactic core glow, baked once (used by spiral mode)
    function buildSpiralCoreSprite() {
      const size = 220
      const sprite = document.createElement('canvas')
      sprite.width = size
      sprite.height = size
      const sctx = sprite.getContext('2d')!
      const gradient = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      gradient.addColorStop(0.35, `rgba(${lerpColor(0.1)}, 0.7)`)
      gradient.addColorStop(1, `rgba(${lerpColor(0.3)}, 0)`)
      sctx.fillStyle = gradient
      sctx.beginPath()
      sctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      sctx.fill()
      spiralCoreSprite = sprite
    }

    function seedNebula() {
      // sharp foreground starfield: small crisp points, varied alpha, gentle
      // drift + a sinusoidal twinkle so it never reads as static
      const starTotal = 300 // within the 260-320 spec range
      nebulaStars = Array.from({ length: starTotal }, (_, i) => ({
        x: rand01(i, 30) * width,
        y: rand01(i, 31) * height,
        vx: (rand01(i, 13) - 0.5) * 0.05,
        vy: (rand01(i + 1, 14) - 0.5) * 0.05,
        radius: 0.6 + rand01(i, 32) * 1.2, // 0.6-1.8px
        alphaMul: 0.4 + rand01(i, 33) * 0.6, // 0.4-1.0
        twinkleSeed: rand01(i, 34) * Math.PI * 2,
        twinklePeriod: 1.5 + rand01(i, 46) * 3.5, // 1.5-5s
      }))

      // faint, large, slow-drifting background haze -- atmospheric wash,
      // not discrete dots; richer color variety across the sprite set
      const hazeTotal = 19 // within the 16-22 spec range
      nebulaHaze = Array.from({ length: hazeTotal }, (_, i) => ({
        x: rand01(i, 36) * width,
        y: rand01(i, 37) * height,
        vx: (rand01(i, 38) - 0.5) * 0.06,
        vy: (rand01(i, 39) - 0.5) * 0.06,
        radius: 80 + rand01(i, 40) * 120, // 80-200px
        spriteIndex: Math.min(4, Math.round(rand01(i, 35) * 4)),
      }))

      shootingStars = []
      shootingStarTimer = 0
      shootingStarNextAt = 5 + rand01(1, 47) * 4 // first one in ~5-9s
    }

    function seedSingularity() {
      // Gargantua composition: a dark shadow (Rs) ringed by a thin bright
      // photon ring, a strongly flattened front accretion disk that crosses
      // in front of the shadow, and the far half of that same disk lensed
      // into a vertical halo arcing over (and faintly under) the shadow.
      // Overall span (shadow + disk) ~70% of viewport width.
      const narrow = width < 640
      singularityCenter = narrow
        ? { x: width * 0.5, y: height * 0.3 }
        : { x: width * 0.55, y: height * 0.45 }

      // shadow radius Rs -- everything else scales off this. Front-disk
      // outer edge reaches 3.2x Rs, so 2*3.2*Rs ~= 0.7 * width.
      shadowRadius = width * (narrow ? 0.085 : 0.109)
      // photon ring: thin, nearly-circular, just outside the shadow
      photonRadiusX = shadowRadius * 1.09
      photonRadiusY = shadowRadius * 1.02

      // multiple radial bands (in units of Rs): denser inner band, sparser
      // outer band, each with its own flatten ratio (0.10-0.16) so the
      // front disk reads as a thin plane, not a fat ellipse
      const bandDefs = [
        { count: 220, rMin: 1.35, rMax: 1.85, omegaMin: 0.4, omegaMax: 0.62, flatten: 0.11 },
        { count: 190, rMin: 1.85, rMax: 2.55, omegaMin: 0.24, omegaMax: 0.4, flatten: 0.13 },
        { count: 160, rMin: 2.55, rMax: 3.2, omegaMin: 0.14, omegaMax: 0.24, flatten: 0.16 },
      ]
      diskParticles = []
      bandFlatten = bandDefs.map((bd) => bd.flatten)
      let idx = 0
      bandDefs.forEach((bd, band) => {
        for (let i = 0; i < bd.count; i++) {
          const angle = rand01(idx, 17) * Math.PI * 2
          const radiusJitter = bd.rMin + rand01(idx, 18) * (bd.rMax - bd.rMin)
          const normalized = (radiusJitter - bd.rMin) / (bd.rMax - bd.rMin)
          diskParticles.push({
            angle,
            radiusJitter,
            // Keplerian: inner particles orbit faster than outer ones
            omega: bd.omegaMax - (bd.omegaMax - bd.omegaMin) * normalized,
            size: 1.1 + rand01(idx, 20) * 1.3, // 1.1-2.4px -- must read at a glance, not just under a loupe
            shimmerSeed: rand01(idx, 23) * Math.PI * 2,
            band,
          })
          idx++
        }
      })

      const ambientTotal = 130 // 120+ dim stars across the whole viewport
      ambientStars = Array.from({ length: ambientTotal }, (_, i) => ({
        x: rand01(i, 21) * width,
        y: rand01(i, 22) * height,
        vx: (rand01(i, 24) - 0.5) * 0.03,
        vy: (rand01(i, 25) - 0.5) * 0.03,
      }))
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
      // bumped rotation speed so it's clearly perceptible (a full revolution
      // roughly every 35-45s, vs. the prior 60-90s)
      spiralRotationPrev2 = spiralRotationPrev1
      spiralRotationPrev1 = spiralRotation
      spiralRotation += dt * 0.16
      ctx!.clearRect(0, 0, width, height)

      // milky-way haze arms, behind everything -- rotates with the particles
      for (const h of spiralHaze) {
        const angle = h.baseAngle + spiralRotation
        const x = spiralCenter.x + h.r * Math.cos(angle)
        const y = spiralCenter.y + h.r * Math.sin(angle)
        ctx!.globalAlpha = 0.06 + (h.spriteIndex / 4) * 0.06 // up to ~0.12
        ctx!.drawImage(nebulaSprites[h.spriteIndex], x - h.radius, y - h.radius, h.radius * 2, h.radius * 2)
      }
      ctx!.globalAlpha = 1

      // bright galactic core glow, also behind the particles
      if (spiralCoreSprite) {
        const coreR = 90 // brighter/larger core
        ctx!.globalAlpha = 0.26
        ctx!.drawImage(spiralCoreSprite, spiralCenter.x - coreR, spiralCenter.y - coreR, coreR * 2, coreR * 2)
        ctx!.globalAlpha = 1
      }

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

      // persistent low-alpha orbit paths for a subset of particles (every
      // other one) so the structure reads clearly instead of muddying into
      // a dense web now that there are more particles/attractors
      ctx!.lineWidth = 1
      for (let i = 0; i < orbitParticles.length; i += 2) {
        const p = orbitParticles[i]
        ctx!.strokeStyle = `rgba(${purpleRgb}, 0.07)`
        ctx!.beginPath()
        ctx!.ellipse(p.cx, p.cy, p.a, p.b, p.phi, 0, Math.PI * 2)
        ctx!.stroke()
      }

      // small glowing core dot at each attractor so orbits visibly belong
      // to an anchor
      for (const attractor of orbitAttractors) {
        ctx!.save()
        ctx!.shadowColor = `rgba(${cyanRgb}, 0.85)`
        ctx!.shadowBlur = 12
        ctx!.fillStyle = `rgba(${cyanRgb}, ${baseAlpha})`
        ctx!.beginPath()
        ctx!.arc(attractor.x, attractor.y, 2.8, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
      }

      const trailAlpha = baseAlpha
      for (const p of orbitParticles) {
        p.prevTheta2 = p.prevTheta1
        p.prevTheta1 = p.theta
        p.theta += p.omega * dt
        const cosPhi = Math.cos(p.phi)
        const sinPhi = Math.sin(p.phi)

        const drawAt = (theta: number, alpha: number, size: number) => {
          const ex = p.a * Math.cos(theta)
          const ey = p.b * Math.sin(theta)
          const x = p.cx + ex * cosPhi - ey * sinPhi
          const y = p.cy + ex * sinPhi + ey * cosPhi
          ctx!.fillStyle = `rgba(${cyanRgb}, ${alpha})`
          ctx!.beginPath()
          ctx!.arc(x, y, size, 0, Math.PI * 2)
          ctx!.fill()
        }
        // slightly longer fading tail (re-evaluated at the previous two
        // theta values, same cheap no-buffer technique) so orbital motion
        // reads clearly
        drawAt(p.prevTheta2, trailAlpha * 0.22, 1.6)
        drawAt(p.prevTheta1, trailAlpha * 0.55, 1.75)
        drawAt(p.theta, trailAlpha, 1.9)
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
        // pulse brightens one already-visible path from baseline to ~0.28,
        // an accent on top of the persistent orbits rather than the only signal
        const arcAlpha = 0.08 + envelope * 0.2
        const op = orbitParticles[orbitArc.index]
        ctx!.strokeStyle = `rgba(${purpleRgb}, ${arcAlpha})`
        ctx!.lineWidth = 1.5
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

      // background haze: large, faint, atmospheric wash behind the stars
      for (const p of nebulaHaze) {
        p.x += p.vx * step
        p.y += p.vy * step
        if (p.x < -p.radius) p.x = width + p.radius
        if (p.x > width + p.radius) p.x = -p.radius
        if (p.y < -p.radius) p.y = height + p.radius
        if (p.y > height + p.radius) p.y = -p.radius
        const peakAlpha = 0.1 + (p.spriteIndex / 4) * 0.06 // 0.10-0.16
        ctx!.globalAlpha = peakAlpha
        ctx!.drawImage(nebulaSprites[p.spriteIndex], p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2)
      }
      ctx!.globalAlpha = 1

      // sharp foreground starfield with an obvious sinusoidal twinkle --
      // amplitude and period vary per star so motion doesn't read as one
      // uniform pulse
      const now = performance.now() * 0.001
      for (const p of nebulaStars) {
        p.x += p.vx * step
        p.y += p.vy * step
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0
        const angularFreq = (Math.PI * 2) / p.twinklePeriod
        const twinkle = 0.5 + 0.5 * Math.sin(now * angularFreq + p.twinkleSeed) // +/-50% swing
        const alpha = baseAlpha * p.alphaMul * twinkle
        ctx!.fillStyle = `rgba(${cyanRgb}, ${alpha})`
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fill()
      }

      // occasional shooting star: bright head + fading linear tail, at most
      // 1-2 alive at once, cheap (no sprite, just a gradient-stroked line)
      shootingStarTimer += dt
      if (shootingStarTimer >= shootingStarNextAt && shootingStars.length < 2) {
        const fromLeft = rand01(shootingStarTimer, 48) < 0.5
        const startX = fromLeft ? -20 : width + 20
        const startY = rand01(shootingStarTimer, 49) * height * 0.6
        const speed = width * (0.6 + rand01(shootingStarTimer, 50) * 0.3)
        const dirX = (fromLeft ? 1 : -1) * speed
        const dirY = speed * (0.35 + rand01(shootingStarTimer, 51) * 0.25)
        const duration = 0.6 + rand01(shootingStarTimer, 52) * 0.4
        shootingStars.push({ x: startX, y: startY, vx: dirX, vy: dirY, life: 0, duration })
        shootingStarTimer = 0
        shootingStarNextAt = 5 + rand01(shootingStarTimer + 1, 53) * 4 // next in ~5-9s
      }
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i]
        s.life += dt
        if (s.life >= s.duration) {
          shootingStars.splice(i, 1)
          continue
        }
        s.x += s.vx * dt
        s.y += s.vy * dt
        const envelope = 1 - s.life / s.duration
        const tailX = s.x - s.vx * 0.05
        const tailY = s.y - s.vy * 0.05
        const gradient = ctx!.createLinearGradient(tailX, tailY, s.x, s.y)
        gradient.addColorStop(0, `rgba(255, 255, 255, 0)`)
        gradient.addColorStop(1, `rgba(255, 255, 255, ${0.9 * envelope})`)
        ctx!.strokeStyle = gradient
        ctx!.lineWidth = 1.5
        ctx!.beginPath()
        ctx!.moveTo(tailX, tailY)
        ctx!.lineTo(s.x, s.y)
        ctx!.stroke()
        ctx!.fillStyle = `rgba(255, 255, 255, ${envelope})`
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, 1.3, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function drawSingularity(dt: number) {
      ctx!.clearRect(0, 0, width, height)
      const step = dt * 60
      const cx = singularityCenter.x
      const cy = singularityCenter.y
      const Rs = shadowRadius
      const nowSec = performance.now() * 0.001
      // slight tilt for the front disk plane only -- the photon ring and
      // lensed halo stay upright/near-circular regardless of disk tilt
      const diskTilt = -0.12
      const cosT = Math.cos(diskTilt)
      const sinT = Math.sin(diskTilt)

      // dim ambient background stars, slow drift, across the whole viewport
      ctx!.fillStyle = `rgba(${cyanRgb}, ${baseAlpha * 0.55})`
      for (const s of ambientStars) {
        s.x += s.vx * step
        s.y += s.vy * step
        if (s.x < 0) s.x = width
        if (s.x > width) s.x = 0
        if (s.y < 0) s.y = height
        if (s.y > height) s.y = 0
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, 1.3, 0, Math.PI * 2)
        ctx!.fill()
      }

      // advance orbital motion once; shared by the lensed-halo pass and the
      // front-disk pass below
      for (const p of diskParticles) p.angle += p.omega * dt

      // ---- painted lensed-halo bands: continuous ribbons of light under
      // the halo particle texture, folding over the top of the shadow with
      // a fainter mirrored ribbon underneath. Additive so overlapping bands
      // build up brightness like the reference instead of flattening.
      ctx!.save()
      ctx!.globalCompositeOperation = 'lighter'
      const haloBandSegs = 44
      for (const band of haloBands) {
        const vr = Rs * (1.3 + 0.85 * band.rNorm)
        const hr = Rs * (1.15 + 0.25 * band.rNorm)
        const vrUnder = vr * 0.45
        const hrUnder = hr * 0.9
        ctx!.lineWidth = band.lineWidth
        ctx!.shadowBlur = band.blur
        for (let i = 0; i < haloBandSegs; i++) {
          const a0 = Math.PI + (i / haloBandSegs) * Math.PI
          const a1 = Math.PI + ((i + 1) / haloBandSegs) * Math.PI
          const aMid = (a0 + a1) / 2
          const doppler = 1 + 1.5 * Math.max(0, Math.cos(aMid - singularityBiasAngle))
          const alpha = Math.min(0.85, band.alpha * doppler)
          ctx!.shadowColor = `rgba(${band.colorRgb}, ${Math.min(1, alpha * 1.1)})`
          ctx!.strokeStyle = `rgba(${band.colorRgb}, ${alpha})`
          ctx!.beginPath()
          ctx!.ellipse(cx, cy, hr, vr, 0, a0, a1)
          ctx!.stroke()

          // fainter mirrored ribbon under the shadow
          const underAlpha = alpha * 0.45
          ctx!.shadowColor = `rgba(${band.colorRgb}, ${Math.min(1, underAlpha * 1.1)})`
          ctx!.strokeStyle = `rgba(${band.colorRgb}, ${underAlpha})`
          ctx!.beginPath()
          ctx!.ellipse(cx, cy, hrUnder, vrUnder, 0, a0 - Math.PI, a1 - Math.PI)
          ctx!.stroke()
        }
      }
      ctx!.restore()

      // ---- lensed far side: folded up into a vertical halo over (and,
      // fainter, under) the shadow, per Gargantua's gravitational lensing.
      // Larger orbits arc higher, so the halo has real radial structure.
      ctx!.save()
      ctx!.shadowColor = `rgba(${cyanRgb}, 0.9)`
      ctx!.shadowBlur = 10
      for (const p of diskParticles) {
        const sinA = Math.sin(p.angle)
        if (sinA >= 0) continue // near-side particle, drawn in the front pass
        const doppler = 1 + 0.6 * Math.max(0, Math.cos(p.angle - singularityBiasAngle))
        const shimmer = 0.85 + 0.15 * Math.sin(nowSec * 1.8 + p.shimmerSeed)
        const alpha = Math.min(0.9, baseAlpha * 0.8 * doppler * shimmer)
        const rNorm = (p.radiusJitter - 1.35) / 1.85
        const vr = Rs * (1.3 + 0.85 * rNorm)
        const hr = Rs * (1.15 + 0.25 * rNorm)
        const cosA = Math.cos(p.angle)
        const x = cx + hr * cosA
        const y = cy + vr * sinA // sinA < 0 here, so this arcs above center
        ctx!.fillStyle = `rgba(${cyanRgb}, ${alpha})`
        ctx!.beginPath()
        ctx!.arc(x, y, p.size * 1.15, 0, Math.PI * 2)
        ctx!.fill()

        // fainter secondary image, mirrored under the shadow
        const vrUnder = vr * 0.45
        const hrUnder = hr * 0.9
        const xUnder = cx + hrUnder * cosA
        const yUnder = cy - vrUnder * sinA // mirrors below center
        ctx!.fillStyle = `rgba(${cyanRgb}, ${alpha * 0.5})`
        ctx!.beginPath()
        ctx!.arc(xUnder, yUnder, p.size * 0.9, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.restore()

      // ---- shadow: filled near-black circle ----
      ctx!.fillStyle = 'rgba(3, 4, 10, 0.97)'
      ctx!.beginPath()
      ctx!.arc(cx, cy, Rs, 0, Math.PI * 2)
      ctx!.fill()

      // ---- photon ring: thin, brilliant, continuous, nearly circular --
      // brighter on the doppler-approaching (left) side. Drawn as short
      // segments so the brightness gradient reads as one folded halo.
      ctx!.save()
      ctx!.shadowColor = `rgba(${cyanRgb}, 0.9)`
      ctx!.shadowBlur = 14
      ctx!.lineWidth = 2
      const ringSegments = 48
      for (let i = 0; i < ringSegments; i++) {
        const a0 = (i / ringSegments) * Math.PI * 2
        const a1 = ((i + 1) / ringSegments) * Math.PI * 2
        const aMid = (a0 + a1) / 2
        const doppler = 1 + 0.6 * Math.max(0, Math.cos(aMid - singularityBiasAngle))
        const alpha = Math.min(1, baseAlpha * 0.9 * doppler)
        ctx!.strokeStyle = `rgba(255, 255, 255, ${alpha})`
        ctx!.beginPath()
        ctx!.ellipse(cx, cy, photonRadiusX, photonRadiusY, 0, a0, a1)
        ctx!.stroke()
      }
      ctx!.restore()

      // ---- painted front-disk bands: continuous ribbons of light drawn
      // under the front-disk particle texture, same center/tilt/flatten
      // geometry as the particle bands. Additive + doppler-brightened on
      // the approaching (left) side so the disk reads as painted light
      // instead of dot-spray, matching the reference.
      ctx!.save()
      ctx!.globalCompositeOperation = 'lighter'
      const frontBandSegs = 48
      for (const band of frontDiskBands) {
        const radiusX = Rs * band.rMid
        const radiusY = radiusX * band.flatten
        ctx!.lineWidth = band.lineWidth
        ctx!.shadowBlur = band.blur
        for (let i = 0; i < frontBandSegs; i++) {
          const a0 = (i / frontBandSegs) * Math.PI
          const a1 = ((i + 1) / frontBandSegs) * Math.PI
          const aMid = (a0 + a1) / 2
          const doppler = 1 + 1.5 * Math.max(0, Math.cos(aMid - singularityBiasAngle))
          const alpha = Math.min(0.85, band.alpha * doppler)
          ctx!.shadowColor = `rgba(${band.colorRgb}, ${Math.min(1, alpha * 1.1)})`
          ctx!.strokeStyle = `rgba(${band.colorRgb}, ${alpha})`
          ctx!.beginPath()
          ctx!.ellipse(cx, cy, radiusX, radiusY, diskTilt, a0, a1)
          ctx!.stroke()
        }
      }
      ctx!.restore()

      // ---- front disk: near-side particles, strongly flattened, crossing
      // in front of the shadow (drawn after the shadow + ring so they
      // occlude both). Keplerian motion + doppler beaming + shimmer.
      ctx!.save()
      ctx!.shadowColor = `rgba(${cyanRgb}, 0.9)`
      ctx!.shadowBlur = 8
      for (const p of diskParticles) {
        const sinA = Math.sin(p.angle)
        if (sinA < 0) continue // far-side particle, handled by the halo pass
        const flatten = bandFlatten[p.band] ?? 0.13
        const ex = Rs * p.radiusJitter * Math.cos(p.angle)
        const ey = Rs * p.radiusJitter * sinA * flatten
        const x = cx + ex * cosT - ey * sinT
        const y = cy + ex * sinT + ey * cosT
        // doppler beaming kept, but the disk needs to actually read as a
        // dense glowing band -- foreground text stays readable via the
        // panel's own translucent backdrop, not via near-zero particle alpha
        const doppler = 1 + 0.6 * Math.max(0, Math.cos(p.angle - singularityBiasAngle))
        const shimmer = 0.85 + 0.15 * Math.sin(nowSec * 1.8 + p.shimmerSeed)
        const alpha = Math.min(0.95, baseAlpha * 0.85 * doppler * shimmer)
        ctx!.fillStyle = `rgba(${cyanRgb}, ${alpha})`
        ctx!.beginPath()
        ctx!.arc(x, y, p.size, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.restore()
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

    // built once per mount, resolution-independent
    if (mode === 'nebula' || mode === 'spiral') buildNebulaSprites()
    if (mode === 'spiral') buildSpiralCoreSprite()
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
