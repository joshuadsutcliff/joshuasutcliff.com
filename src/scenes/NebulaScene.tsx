import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector2, type ShaderMaterial } from 'three';
import { nebulaFragmentShader, nebulaVertexShader } from './nebulaShader';

export interface NebulaSceneProps {
  /** When true the scene is rendered exactly once and never animated. */
  reduced: boolean;
  /** Normalised scroll progress, 0 to 1, written by the Lenis driver. */
  scrollRef: MutableRefObject<number>;
}

// Fill rate budget. A fullscreen volumetric march with fbm octaves is the
// most fill hungry thing in this set, so both the step count and the octave
// count are uniforms with hard caps in the shader. Narrow viewports get a
// smaller budget: the same shape as DepthStage's own dpr cap, but computed
// here because DepthStage is not ours to edit.
const DESKTOP_STEPS = 30;
const DESKTOP_OCTAVES = 4;
const MOBILE_STEPS = 24;
const MOBILE_OCTAVES = 3;

function computeBudget(): { steps: number; octaves: number } {
  if (typeof window === 'undefined') {
    return { steps: DESKTOP_STEPS, octaves: DESKTOP_OCTAVES };
  }
  return window.innerWidth < 640
    ? { steps: MOBILE_STEPS, octaves: MOBILE_OCTAVES }
    : { steps: DESKTOP_STEPS, octaves: DESKTOP_OCTAVES };
}

function easeInOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

// Initial uniform values only. This object is NEVER written to after mount.
// react-three-fiber does not adopt this object as the material's uniform
// holder: applyProps copies it entry by entry into the material's own
// `uniforms` map (`uniforms[name] = { ...uniform }`), so every per frame
// write has to go through `material.uniforms`, not through this object.
const budget = computeBudget();
const initialUniforms = {
  uTime: { value: 0 },
  uResolution: { value: new Vector2(1, 1) },
  uScroll: { value: 0 },
  // The single moving element: the noise domain of the cloud creeps along z.
  // Nothing else in the frame translates.
  uDrift: { value: 0 },
  uSteps: { value: budget.steps },
  uOctaves: { value: budget.octaves },
  uGain: { value: 1.0 },
};

const DRIFT_RATE = 0.018;

/**
 * Fullscreen volumetric quad. The vertex shader emits clip space directly so
 * this mesh always covers the viewport, and the entire nebula lives in the
 * bounded ray march in the fragment shader.
 */
export default function NebulaScene({ reduced, scrollRef }: NebulaSceneProps) {
  const materialRef = useRef<ShaderMaterial>(null);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;

    const u = material.uniforms;

    const { width, height } = state.size;
    const dpr = state.viewport.dpr;
    u.uResolution.value.set(width * dpr, height * dpr);

    if (reduced) {
      // Static path: resolution only, then nothing else ever changes. No
      // invalidate is scheduled, so with frameloop="demand" this runs for the
      // single mount frame and then stops. uTime, uScroll and uDrift stay at
      // their initial values, which already render the full composition.
      return;
    }

    const t = state.clock.elapsedTime;
    u.uTime.value = t;
    u.uScroll.value = easeInOutCubic(scrollRef.current);
    u.uDrift.value = t * DRIFT_RATE;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        uniforms={initialUniforms}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
