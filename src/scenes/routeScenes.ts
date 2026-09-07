// This module is intentionally unreferenced: it preserves the route-to-scene
// mapping used by the animated backgrounds so it can be wired back into
// Layout.tsx when the backgrounds are reintroduced.
import type { ParticleMode } from '../components/ParticleField'

export type DepthScene = 'blackhole' | 'galaxy' | 'starfield' | 'orbital' | 'nebula'

export function sceneForPath(pathname: string): DepthScene | null {
  if (pathname === '/') return 'starfield'
  if (pathname === '/about') return 'blackhole'
  if (pathname === '/projects') return 'galaxy'
  if (pathname === '/work') return 'orbital'
  if (pathname === '/resume') return 'nebula'
  return null
}

export function modeForPath(pathname: string): ParticleMode {
  if (pathname === '/') return 'constellation'
  if (pathname === '/work') return 'orbital'
  if (pathname === '/about') return 'singularity'
  if (pathname === '/resume') return 'nebula'
  return 'spiral'
}
