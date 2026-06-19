import { useEffect, useRef } from 'react'

/**
 * Lightweight canvas particle field — subtle drifting nodes with near-neighbor
 * links, tinted by the active accent. Pauses when offscreen / reduced-motion.
 */
export default function ParticleField() {
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    type P = { x: number; y: number; vx: number; vy: number }
    let particles: P[] = []

    function rand(min: number, max: number) {
      // deterministic-ish jitter without Math.random dependency concerns
      return min + (max - min) * Math.abs(Math.sin((performance.now() + min * 97.3) * 0.0001 + max))
    }

    function seed() {
      const count = Math.min(70, Math.floor((width * height) / 18000))
      particles = Array.from({ length: count }, (_, i) => ({
        x: rand(i * 13, width),
        y: rand(i * 7, height),
        vx: (rand(i, 1) - 0.5) * 0.25,
        vy: (rand(1, i + 2) - 0.5) * 0.25,
      }))
    }

    function resize() {
      width = canvas!.offsetWidth
      height = canvas!.offsetHeight
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    function accent() {
      const styles = getComputedStyle(document.documentElement)
      return styles.getPropertyValue('--cyan-rgb').trim() || '6, 182, 212'
    }
    function alpha() {
      const styles = getComputedStyle(document.documentElement)
      return parseFloat(styles.getPropertyValue('--particle-alpha')) || 0.4
    }

    function frame() {
      const rgb = accent()
      const a = alpha()
      ctx!.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
      }

      // links
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a1 = particles[i]
          const b1 = particles[j]
          const dx = a1.x - b1.x
          const dy = a1.y - b1.y
          const dist = Math.hypot(dx, dy)
          if (dist < 130) {
            const o = (1 - dist / 130) * a * 0.5
            ctx!.strokeStyle = `rgba(${rgb}, ${o})`
            ctx!.lineWidth = 1
            ctx!.beginPath()
            ctx!.moveTo(a1.x, a1.y)
            ctx!.lineTo(b1.x, b1.y)
            ctx!.stroke()
          }
        }
      }

      // nodes
      for (const p of particles) {
        ctx!.fillStyle = `rgba(${rgb}, ${a})`
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, 1.4, 0, Math.PI * 2)
        ctx!.fill()
      }

      raf = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    if (!reduced) {
      raf = requestAnimationFrame(frame)
    } else {
      frame() // render one static frame
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
