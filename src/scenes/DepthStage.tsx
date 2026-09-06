import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { prefersReducedMotion } from '../lib/motion';
import BlackHoleScene from './BlackHoleScene';

export interface DepthStageProps {
  scene: 'blackhole';
}

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

function computeDpr(): number {
  if (typeof window === 'undefined') return 1;
  const ratio = window.devicePixelRatio || 1;
  const cap = window.innerWidth < 640 ? 1.25 : 1.75;
  return Math.min(ratio, cap);
}

export default function DepthStage({ scene }: DepthStageProps) {
  void scene;
  // Evaluated once at mount: the whole reduced motion branch, including
  // whether Lenis exists at all, hangs off this single value.
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const dpr = useMemo(() => computeDpr(), []);
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
        <BlackHoleScene reduced={reduced} scrollRef={scrollRef} />
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
      </Canvas>
    </div>
  );
}
