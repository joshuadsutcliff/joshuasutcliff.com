import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector2, Vector3, type ShaderMaterial } from 'three';
import { blackHoleFragmentShader, blackHoleVertexShader } from './blackHoleShader';

export interface BlackHoleSceneProps {
  /** When true the scene is rendered exactly once and never animated. */
  reduced: boolean;
  /** Normalised scroll progress, 0 to 1, written by the Lenis driver. */
  scrollRef: MutableRefObject<number>;
}

// Camera rig constants. The camera sits slightly above the equatorial
// plane so the far side of the disk is lensed up and over the top of the
// shadow, which is the signature of a real lensing render.
const BASE_DISTANCE = 32.0;
const PUSH_IN = 5.2;
const BASE_HEIGHT = 4.8;
// Note: this is not the vertical field of view. The shader builds rays as
// forward * focal + right * uv.x + up * uv.y with focal = 1 / tan(0.5 * FOV)
// and uv.y spanning plus or minus 0.5, so the true vertical field of view is
// 2 * atan(0.5 / focal). FOV = 1.600 gives focal 0.964, a natural 55 degrees.
const FOV = 1.600;

function easeInOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

// Initial uniform values only. This object is NEVER written to after mount.
// react-three-fiber does not adopt this object as the material's uniform
// holder: applyProps copies it entry by entry into the material's own
// `uniforms` map (`uniforms[name] = { ...uniform }`), so every per frame
// write has to go through `material.uniforms`, not through this object.
const initialUniforms = {
  uTime: { value: 0 },
  uResolution: { value: new Vector2(1, 1) },
  uCamPos: { value: new Vector3(0, BASE_HEIGHT, BASE_DISTANCE) },
  uFov: { value: FOV },
  uScroll: { value: 0 },
  uSpin: { value: 0 },
  // Step budget for the ray march, tunable without touching the shader.
  uSteps: { value: 150 },
  // Eased cursor position, -1..1 per axis, centered when idle or reduced.
  uPointer: { value: new Vector2(0, 0) },
};

/**
 * Fullscreen lensing quad. The vertex shader emits clip space directly,
 * so this mesh always covers the viewport regardless of the camera, and
 * all of the actual geometry lives in the ray march in the fragment
 * shader.
 */
export default function BlackHoleScene({ reduced, scrollRef }: BlackHoleSceneProps) {
  const materialRef = useRef<ShaderMaterial>(null);

  // Pointer target written by a window listener; pointerRef is the eased
  // value the shader actually sees. Plain numbers in refs, so nothing is
  // allocated per frame and nothing re-renders React.
  const targetRef = useRef({ x: 0, y: 0 });
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Under reduced motion the listener is never attached at all, so there
    // is no path by which pointer movement can change the frozen frame.
    if (reduced) return;
    const onMove = (event: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      // Normalised to -1..1 and clamped; y is flipped so up is positive,
      // matching the shader's ray space.
      const nx = Math.min(Math.max((event.clientX / w) * 2 - 1, -1), 1);
      const ny = Math.min(Math.max((event.clientY / h) * 2 - 1, -1), 1);
      targetRef.current.x = nx;
      targetRef.current.y = -ny;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced]);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;

    const u = material.uniforms;

    const { width, height } = state.size;
    const dpr = state.viewport.dpr;
    u.uResolution.value.set(width * dpr, height * dpr);

    if (reduced) {
      // Static path: resolution only, then nothing else ever changes.
      // No invalidate is scheduled, so with frameloop="demand" this runs
      // for the single mount frame and then stops.
      return;
    }

    const t = state.clock.elapsedTime;
    const scroll = easeInOutCubic(scrollRef.current);

    u.uTime.value = t;
    u.uScroll.value = scroll;
    // Slow disk rotation. Everything here is deliberately unhurried.
    u.uSpin.value = t * 0.16;

    // Very slow camera drift on a sine, plus a scroll driven push in and
    // a small tilt. Sine and eased scroll keep the motion off linear.
    const azimuth = Math.sin(t * 0.035) * 0.16;
    const distance = BASE_DISTANCE - PUSH_IN * scroll;
    const height3d = BASE_HEIGHT + Math.sin(t * 0.027) * 0.34 + scroll * 0.85;

    u.uCamPos.value.set(
      Math.sin(azimuth) * distance,
      height3d,
      Math.cos(azimuth) * distance,
    );

    // Eased pointer follow. The lerp is slow enough that a flick of the
    // mouse arrives as a glide, never as a jump. Written through
    // material.uniforms; the module scope initialUniforms object is never
    // touched after mount.
    const ptr = pointerRef.current;
    ptr.x += (targetRef.current.x - ptr.x) * 0.05;
    ptr.y += (targetRef.current.y - ptr.y) * 0.05;
    u.uPointer.value.set(ptr.x, ptr.y);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={blackHoleVertexShader}
        fragmentShader={blackHoleFragmentShader}
        uniforms={initialUniforms}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
