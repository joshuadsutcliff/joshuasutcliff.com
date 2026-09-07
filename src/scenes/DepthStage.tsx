import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { prefersReducedMotion } from '../lib/motion';

export interface DepthStageProps {
  scene: 'blackhole' | 'galaxy' | 'starfield' | 'orbital' | 'nebula';
}

// Each scene is its own lazy chunk so a visitor to one depth route never
// downloads another scene's shader. Do not hoist these to static imports.
const BlackHoleScene = lazy(() => import('./BlackHoleScene'));
const GalaxyScene = lazy(() => import('./GalaxyScene'));
const StarfieldScene = lazy(() => import('./StarfieldScene'));
const OrbitalScene = lazy(() => import('./OrbitalScene'));
const NebulaScene = lazy(() => import('./NebulaScene'));

/**
 * Releases the WebGL context on unmount. Browsers cap live contexts at
 * roughly 8 to 16, and r3f's own teardown does not reliably free the
 * context itself, so this is explicit.
 */
function ContextDisposer() {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    return () => {
      try {
        const ext = gl.getContext().getExtension('WEBGL_lose_context');
        gl.forceContextLoss();
        gl.dispose();
        if (ext) ext.loseContext();
      } catch {
        // Teardown is best effort: never throw during unmount.
      }
    };
  }, [gl]);
  return null;
}

/**
 * Lenis smooth scroll driver. Mounted only when reduced motion is off,
 * so on the reduced motion path Lenis is never constructed and the
 * `lenis` class is never added to the document element.
 */
function LenisDriver({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const lenisRef = useRef<import('lenis').default | null>(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    let disposed = false;
    let instance: import('lenis').default | null = null;

    import('lenis')
      .then(({ default: Lenis }) => {
        if (disposed) return;
        instance = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
        lenisRef.current = instance;
        document.documentElement.classList.add('lenis');
        instance.on('scroll', () => {
          const limit = instance && instance.limit > 0 ? instance.limit : 1;
          const progress = instance ? instance.scroll / limit : 0;
          scrollRef.current = Math.min(Math.max(progress, 0), 1);
          invalidate();
        });
      })
      .catch(() => {
        // Without Lenis the scene simply keeps its default scroll value.
      });

    return () => {
      disposed = true;
      lenisRef.current = null;
      if (instance) instance.destroy();
      document.documentElement.classList.remove('lenis');
    };
  }, [scrollRef, invalidate]);

  // Lenis expects milliseconds, r3f's clock is in seconds.
  useFrame((state) => {
    lenisRef.current?.raf(state.clock.elapsedTime * 1000);
  });

  return null;
}

// Depth-of-field focus for the orbital scene, as a world distance from the
// camera. The orbital system's centre of mass sits 9 world units from the
// camera; focus is parked slightly in front of it so the core and the near
// half of every orbit stay crisp while the far half of each inclined orbit
// falls out of focus. Duplicated as literals rather than imported from
// OrbitalScene, which would drag that scene out of its own lazy chunk.
const ORBITAL_FOCUS_DISTANCE = 7.90;
const ORBITAL_FOCUS_RANGE = 1.10;

// Bokeh radius for the orbital scene's depth-of-field pass. 2.8 is tuned for a
// desktop-sized render; at 320 CSS pixels wide the whole system spans only a
// couple of hundred device pixels, and a blur of that radius is a large
// fraction of it, which turns the orbits into an indistinct smudge. Narrow
// frames therefore get a much smaller radius. Orbital scene only: the three
// shipped scenes have no DepthOfField pass at all.
function computeOrbitalBokeh(): number {
  if (typeof window === 'undefined') return 2.8;
  return window.innerWidth < 640 ? 0.75 : 2.8;
}

function computeDpr(): number {
  if (typeof window === 'undefined') return 1;
  const ratio = window.devicePixelRatio || 1;
  const cap = window.innerWidth < 640 ? 1.25 : 1.75;
  return Math.min(ratio, cap);
}

export default function DepthStage({ scene }: DepthStageProps) {
  // Evaluated once at mount: the whole reduced motion branch, including
  // whether Lenis exists at all, hangs off this single value.
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const dpr = useMemo(() => computeDpr(), []);
  const orbitalBokeh = useMemo(() => computeOrbitalBokeh(), []);
  const scrollRef = useRef(0);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full print:hidden">
      <Canvas
        dpr={dpr}
        frameloop={reduced ? 'demand' : 'always'}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 1], fov: 50 }}
        style={{ width: '100%', height: '100%', display: 'block', background: '#07090f' }}
      >
        <ContextDisposer />
        {!reduced && <LenisDriver scrollRef={scrollRef} />}
        <Suspense fallback={null}>
          {scene === 'blackhole' ? (
            <BlackHoleScene reduced={reduced} scrollRef={scrollRef} />
          ) : scene === 'galaxy' ? (
            <GalaxyScene reduced={reduced} scrollRef={scrollRef} />
          ) : scene === 'orbital' ? (
            <OrbitalScene reduced={reduced} scrollRef={scrollRef} />
          ) : scene === 'nebula' ? (
            <NebulaScene reduced={reduced} scrollRef={scrollRef} />
          ) : (
            <StarfieldScene reduced={reduced} scrollRef={scrollRef} />
          )}
        </Suspense>
        {scene === 'orbital' ? (
          // The orbital scene is the ONLY one with a real, varying depth
          // buffer: its bodies are opaque meshes with depthTest and depthWrite
          // genuinely on. The other three are a fullscreen ray-marched quad
          // and two additive point clouds with depthWrite off, which give
          // DepthOfField a uniform depth buffer and make it blur the whole
          // frame evenly. So this is a SEPARATE, explicit composer tree rather
          // than a conditional child inside the shared one: the shipped
          // scenes' pipeline below stays byte for byte what it already was.
          <EffectComposer>
            <DepthOfField
              worldFocusDistance={ORBITAL_FOCUS_DISTANCE}
              worldFocusRange={ORBITAL_FOCUS_RANGE}
              bokehScale={orbitalBokeh}
            />
            <Bloom
              intensity={0.45}
              luminanceThreshold={0.65}
              luminanceSmoothing={0.22}
              mipmapBlur
            />
            <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.16} />
            <Vignette eskil={false} offset={0.28} darkness={0.72} />
          </EffectComposer>
        ) : (
          <EffectComposer>
            <Bloom
              intensity={0.45}
              luminanceThreshold={0.65}
              luminanceSmoothing={0.22}
              mipmapBlur
            />
            <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.16} />
            <Vignette eskil={false} offset={0.28} darkness={0.72} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
