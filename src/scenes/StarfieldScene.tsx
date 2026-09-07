import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points, type ShaderMaterial } from 'three';
import {
  starfieldFragmentShader,
  starfieldVertexShader,
  starfieldWashFragmentShader,
  starfieldWashVertexShader,
} from './starfieldShader';

export interface StarfieldSceneProps {
  /** When true the scene is rendered exactly once and never animated. */
  reduced: boolean;
  /** Normalised scroll progress, 0 to 1, written by the Lenis driver. */
  scrollRef: MutableRefObject<number>;
}

// The camera sits at z = CAM_Z and looks straight down -z. It only ever
// TRANSLATES: there is no lookAt back toward a fixed origin, because a
// rotating camera swings every plane through nearly the same screen angle
// and would flatten the exact parallax this scene exists to show.
const CAM_Z = 1.0;

// Plane depths, measured from the camera, not in world z. The ratios between
// them are deliberately large (roughly 2.3x per step) so that near and far
// planes displace by visibly different amounts rather than by amounts that
// are only different on paper. A continuous z distribution would look fine
// but would smear the separation into a gradient.
//
// Screen displacement for a camera shift of d world units at depth D is
// d / (tan(fov/2) * D * aspect) of the half width. At fov 50, 1440x900 and
// the POINTER_MAX below, the full pointer sweep moves the nearest plane by
// about 121 px and the farthest by about 11 px.
const PLANE_DEPTHS = [3.2, 7.5, 17.0, 36.0];
const PLANE_COUNTS_DESKTOP = [520, 850, 1700, 2900]; // 5970 stars
const SMALL_VIEWPORT = 640;
const SMALL_SCALE = 0.42; // 2507 stars on a phone

// Half extents of each plane, as multiples of that plane's depth. Sized for
// the vertical frustum half angle at fov 50 (tan 25deg = 0.4663), widened for
// an aspect ratio up to 2.2 and then given a further 1.25 margin so that no
// drift or pointer extreme can ever pull an empty band into frame.
const HALF_H_PER_DEPTH = 0.4663 * 1.25;
const HALF_W_PER_DEPTH = 0.4663 * 2.2 * 1.25;
const Z_JITTER = 0.10; // fraction of plane depth, keeps planes from reading as flat cards

// Motion budget. All of it is camera translation, all of it small.
const DRIFT_X = 0.16;
const DRIFT_Y = 0.10;
const POINTER_MAX = 0.20; // world units, so a full sweep is 0.40
const POINTER_LERP = 0.045; // per frame ease toward the target, never a raw follow

// Focal plane sits on the nearest star plane, so sharpness falls off
// monotonically with distance. That reinforces the depth read instead of
// fighting it, which a mid focus would.
const FOCAL_DEPTH = PLANE_DEPTHS[0];

// ---------------------------------------------------------------------------
// Galactic plane band.
//
// Real starfields are not uniform, and a uniform one is exactly why this
// scene read as scatter rather than structure. The band is defined in NDC,
// the normalised device coordinates the frame is drawn in, and converted to
// the ANGULAR space (u, v) = (x / depth, y / depth) at build time. Angular
// space is the tangent of the screen angle, so one line there lands on the
// same screen line for every one of the four planes. That is physically what
// a galactic plane at effectively infinite distance does, and it is what
// makes the band survive the parallax: the planes slide past each other
// inside the band instead of the band itself smearing.
//
// Defining the constants in NDC rather than in angular units is what keeps
// the composition intact across viewports. In angular units the core bulge
// would sit at a fixed world angle and a phone's narrow horizontal frustum
// would push it clean off the side of the screen.
// ---------------------------------------------------------------------------

// Vertical half angle tangent at fov 50. Angular units per NDC unit of y.
const NDC_TO_V = 0.4663;

// Screen slope of the band, NDC y per NDC x. Positive runs up to the right.
// This puts the centre line off the left edge low, through the gap between
// the headline and the CTA row, above the bio paragraph's right end, and out
// the top right, which is the frame's dead space.
const BAND_SLOPE = 0.82;
const BAND_OFFSET = 0.045;
// Gaussian half width, about a third of the frame height, which is roughly
// what the Milky Way subtends and reads as a band rather than a stripe.
const BAND_SIGMA = 0.290;
// Off band floor. Kept high on purpose: a band against emptiness reads as a
// painted stripe, not as a starfield that happens to have structure.
const BAND_BASE = 0.20;
const BAND_GAIN = 1.7;
// Dark rift. The classic Milky Way read is a bright band bisected by a dust
// lane, and the same trick is what makes the /projects galaxy arms resolve.
const RIFT_OFFSET = -0.086;
const RIFT_SIGMA = 0.073;
const RIFT_DEPTH = 0.85;
// Core bulge, at 3/4 of the way across the frame and therefore on the band
// where it crosses the empty upper right quadrant. This is the focal point.
const BULGE_X = 0.50;
const BULGE_SIGMA = 0.34;
const BULGE_GAIN = 2.8;

/** Smooth 1D value noise, deterministic, used for irregular band edges. */
function noise1(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => {
    let s = (n * 374761393 + seed * 668265263) >>> 0;
    s = (s ^ (s >>> 13)) >>> 0;
    s = (s * 1274126177) >>> 0;
    return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
  };
  const a = h(i);
  const b = h(i + 1);
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

/**
 * Relative star density at an NDC position. The GLSL wash evaluates the same
 * function with the same constants, so the haze and the stars describe one
 * band rather than two that happen to overlap.
 */
function bandDensity(nx: number, ny: number): number {
  const d = ny - BAND_SLOPE * nx - BAND_OFFSET;

  // Irregular edges: the half width breathes along the band so the boundary
  // never reads as a drawn edge.
  const sigma = BAND_SIGMA * (0.72 + 0.62 * noise1(nx * 1.7 + 11.0, 7));
  const band = Math.exp(-(d / sigma) * (d / sigma));

  // Dust lane, itself wobbling along the band.
  const riftOff = RIFT_OFFSET + 0.039 * (noise1(nx * 2.3 + 4.0, 19) - 0.5) * 2;
  const rd = (d - riftOff) / RIFT_SIGMA;
  const rift = 1 - RIFT_DEPTH * Math.exp(-rd * rd);

  // Density voids scattered through the band, the same idea as the rift but
  // local rather than continuous.
  const voids = 1 - 0.45 * Math.pow(Math.max(0, noise1(nx * 4.2 + 31.0, 43) - 0.55) / 0.45, 2);

  const bulge = 1 + BULGE_GAIN * Math.exp(-Math.pow((nx - BULGE_X) / BULGE_SIGMA, 2));

  return BAND_BASE + BAND_GAIN * band * rift * voids * bulge;
}

const BAND_PEAK = BAND_BASE + BAND_GAIN * (1 + BULGE_GAIN);

function easeInOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/** Viewport aspect, with a floor so an absurdly tall frame cannot blow up the
 *  angular conversion. Read once at mount, exactly like the star count is. */
function viewportAspect(): number {
  if (typeof window === 'undefined' || !window.innerHeight) return 1.6;
  return Math.max(window.innerWidth / window.innerHeight, 0.35);
}

/** Deterministic pseudo random so the frozen reduced motion frame is stable. */
function makeRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface StarBuffers {
  positions: Float32Array;
  props: Float32Array;
  count: number;
}

/**
 * Builds every star once. Nothing here runs again after mount: the vertex
 * shader only projects these points, and the camera does the moving.
 */
function buildStars(scale: number, seed: number, aspect: number): StarBuffers {
  const rand = makeRandom(seed);
  // Angular units per NDC unit of x. Sampling is done in NDC and converted
  // through this, which is what pins the composition to the frame rather
  // than to a world angle.
  const ndcToU = NDC_TO_V * aspect;
  // NDC half extents that the existing angular half extents correspond to.
  const halfNx = HALF_W_PER_DEPTH / ndcToU;
  const halfNy = HALF_H_PER_DEPTH / NDC_TO_V;
  const counts = PLANE_COUNTS_DESKTOP.map((c) => Math.max(60, Math.round(c * scale)));
  const count = counts.reduce((a, b) => a + b, 0);

  const positions = new Float32Array(count * 3);
  const props = new Float32Array(count * 4);

  const nearest = PLANE_DEPTHS[0];
  const farthest = PLANE_DEPTHS[PLANE_DEPTHS.length - 1];

  let i = 0;
  for (let p = 0; p < PLANE_DEPTHS.length; p++) {
    const base = PLANE_DEPTHS[p];
    for (let n = 0; n < counts[p]; n++, i++) {
      const depth = base * (1 + (rand() - 0.5) * 2 * Z_JITTER);

      // Rejection sample the angular position against the band density. The
      // try budget is capped so a mistuned density function can never hang
      // the mount; on giving up the last candidate is simply kept, which at
      // worst puts one extra star off band.
      let nx = 0;
      let ny = 0;
      for (let attempt = 0; attempt < 40; attempt++) {
        nx = (rand() - 0.5) * 2 * halfNx;
        ny = (rand() - 0.5) * 2 * halfNy;
        if (rand() * BAND_PEAK <= bandDensity(nx, ny)) break;
      }

      positions[i * 3] = nx * ndcToU * base;
      positions[i * 3 + 1] = ny * NDC_TO_V * base;
      positions[i * 3 + 2] = CAM_Z - depth;

      // 0 at the nearest plane, 1 at the farthest, on a log scale so the
      // four planes land at roughly even perceptual steps rather than
      // bunching the three near ones together.
      const depthNorm = Math.min(
        1,
        Math.max(0, Math.log(depth / nearest) / Math.log(farthest / nearest)),
      );

      // Intrinsic size grows sub-linearly with depth, so after the 1/z
      // perspective divide the nearest stars still render about twice the
      // diameter of the farthest ones instead of the far planes vanishing
      // entirely. The random term gives the field a natural size spread.
      const sizeVar = 0.75 + rand() * 0.55 + 0.9 * Math.pow(rand(), 9);
      props[i * 4 + 1] = 1.05 * Math.pow(depth, 0.60) * sizeVar;

      // Brightness falls with distance on top of the size falloff. The rare
      // pow() term seeds a handful of noticeably brighter stars per plane,
      // which is what stops a uniform-brightness field from reading as
      // digital noise.
      const bright = 0.34 + 0.55 * Math.pow(rand(), 3.2);
      props[i * 4] = bright * (1 - 0.72 * depthNorm);

      props[i * 4 + 2] = rand();
      props[i * 4 + 3] = depthNorm;
    }
  }

  // ---------------------------------------------------------------------
  // Anchor stars.
  //
  // Hierarchy comes from a few bright things against many faint ones, not
  // from raising the whole field. These twelve are the only stars in the
  // scene that clear the shared Bloom luminance threshold of 0.65, so they
  // are the only ones that bloom, and the first three form a tight asterism
  // sitting on the core bulge so the eye has a single place to land.
  //
  // Coordinates are NDC, so every anchor lands at the same place in the
  // frame on a desktop and on a phone.
  const anchors: Array<[number, number, number, number]> = [
    // ndcX, ndcY, brightness, size multiplier
    // The core asterism, sitting on the bulge.
    [0.478, 0.399, 1.95, 2.60],
    [0.533, 0.484, 1.45, 2.05],
    [0.428, 0.492, 1.28, 1.85],
    // Along the band, spreading the hierarchy out so the core is the peak
    // of a distribution rather than the only bright thing in the frame.
    [0.847, 0.649, 1.18, 1.72],
    [0.238, 0.240, 1.14, 1.66],
    [-0.375, -0.108, 1.12, 1.62],
    [-0.831, -0.418, 1.08, 1.58],
    // Off band, for balance in the quadrants the band does not reach.
    [0.736, -0.067, 1.06, 1.55],
    [0.639, -0.378, 1.04, 1.52],
    [-0.542, -0.889, 1.02, 1.50],
    [-0.792, 0.533, 1.02, 1.50],
    [0.333, 0.733, 1.06, 1.55],
  ];
  const nearDepth = PLANE_DEPTHS[0];
  const nearBaseSize = 1.05 * Math.pow(nearDepth, 0.6);
  for (let a = 0; a < anchors.length && a < count; a++) {
    const [nx, ny, bright, sizeMul] = anchors[a];
    positions[a * 3] = nx * ndcToU * nearDepth;
    positions[a * 3 + 1] = ny * NDC_TO_V * nearDepth;
    positions[a * 3 + 2] = CAM_Z - nearDepth;
    props[a * 4] = bright;
    props[a * 4 + 1] = nearBaseSize * sizeMul;
    // Negative seed is the anchor flag the vertex shader reads to freeze
    // the twinkle. The magnitude is never used for an anchor.
    props[a * 4 + 2] = -1;
    props[a * 4 + 3] = 0;
  }

  return { positions, props, count };
}

// Initial uniform values only. This object is NEVER written to after mount.
// react-three-fiber does not adopt this object as the material's uniform
// holder: applyProps copies it entry by entry into the material's own
// `uniforms` map (`uniforms[name] = { ...uniform }`), so every per frame
// write has to go through `material.uniforms`, not through this object.
const initialUniforms = {
  uTime: { value: 0 },
  uScroll: { value: 0 },
  uPixelRatio: { value: 1 },
  uSizeScale: { value: 8.0 },
  uFocalDepth: { value: FOCAL_DEPTH },
  uCocScale: { value: 0.020 },
  uExposure: { value: 1.0 },
};

// The wash quad sits far behind the farthest star plane, so camera
// translation moves it by a fraction of a pixel and it reads as a fixed
// backdrop rather than as another parallax layer.
const WASH_DEPTH = 60;

// Same rule as initialUniforms above: initial values only, never written.
const initialWashUniforms = {
  uWashDepth: { value: WASH_DEPTH },
  // Angular units per NDC unit of x, so the wash shader can undo the
  // conversion and evaluate the band in the same NDC space the CPU used.
  uNdcToU: { value: NDC_TO_V * 1.6 },
  // Peak linear amplitudes. Both are held far below the 0.65 bloom
  // luminance threshold, so the haze never blooms and never competes with
  // the hero type for contrast.
  uWashAmp: { value: 0.012 },
  uCoreAmp: { value: 0.026 },
};

export default function StarfieldScene({ reduced, scrollRef }: StarfieldSceneProps) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const washMaterialRef = useRef<ShaderMaterial>(null);

  // Pointer target in world units, written by a window listener; pointerRef
  // is the eased value the camera actually uses. Plain numbers in refs, so
  // nothing is allocated per frame and nothing re-renders React.
  const targetRef = useRef({ x: 0, y: 0 });
  const pointerRef = useRef({ x: 0, y: 0 });

  const geometry = useMemo(() => {
    const small = typeof window !== 'undefined' && window.innerWidth < SMALL_VIEWPORT;
    const built = buildStars(small ? SMALL_SCALE : 1, 20260906, viewportAspect());
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(built.positions, 3));
    geo.setAttribute('aProps', new BufferAttribute(built.props, 4));
    geo.computeBoundingSphere();
    return geo;
  }, []);

  useEffect(() => {
    // Under reduced motion the listener is never attached at all, so there
    // is no path by which pointer movement can change the frozen frame.
    if (reduced) return;
    const onMove = (event: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      // Normalised to -1..1, then clamped. The camera moves TOWARD the
      // cursor, which is what makes the field feel like it is being looked
      // around rather than pushed.
      const nx = Math.min(Math.max((event.clientX / w) * 2 - 1, -1), 1);
      const ny = Math.min(Math.max((event.clientY / h) * 2 - 1, -1), 1);
      targetRef.current.x = nx * POINTER_MAX;
      targetRef.current.y = -ny * POINTER_MAX;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced]);

  useFrame((state) => {
    const material = materialRef.current;
    const washMaterial = washMaterialRef.current;
    if (!material || !washMaterial) return;
    const u = material.uniforms;

    const camera = state.camera;
    u.uPixelRatio.value = state.viewport.dpr;
    // The wash needs the same angular per NDC conversion the stars were built
    // with, so its band lines up with theirs. Written here rather than in the
    // geometry memo because a render pass must not mutate module state.
    washMaterial.uniforms.uNdcToU.value = NDC_TO_V * viewportAspect();

    if (reduced) {
      // Static path. The frozen frame is the fully composed image, not a
      // degraded one: the camera sits dead centre and only time, scroll and
      // pointer stay at zero. No invalidate is scheduled, so with
      // frameloop="demand" this runs once at mount and then stops.
      camera.position.set(0, 0, CAM_Z);
      camera.lookAt(0, 0, CAM_Z - 1);
      u.uTime.value = 0;
      u.uScroll.value = 0;
      u.uFocalDepth.value = FOCAL_DEPTH;
      return;
    }

    const t = state.clock.elapsedTime;
    u.uTime.value = t;
    u.uScroll.value = easeInOutCubic(scrollRef.current);

    // Eased pointer follow. The lerp is slow enough that a flick of the
    // mouse arrives as a glide, never as a jump.
    const p = pointerRef.current;
    p.x += (targetRef.current.x - p.x) * POINTER_LERP;
    p.y += (targetRef.current.y - p.y) * POINTER_LERP;

    // Two slow sines of unrelated periods, so the drift never settles onto
    // an obvious beat.
    const driftX = Math.sin(t * 0.037) * DRIFT_X;
    const driftY = Math.sin(t * 0.026 + 1.9) * DRIFT_Y;

    const x = driftX + p.x;
    const y = driftY + p.y;
    camera.position.set(x, y, CAM_Z);
    camera.lookAt(x, y, CAM_Z - 1);
  });

  return (
    <>
      <mesh position={[0, 0, CAM_Z - WASH_DEPTH]} frustumCulled={false} renderOrder={-1}>
        <planeGeometry
          args={[2 * HALF_W_PER_DEPTH * WASH_DEPTH, 2 * HALF_H_PER_DEPTH * WASH_DEPTH]}
        />
        <shaderMaterial
          ref={washMaterialRef}
          vertexShader={starfieldWashVertexShader}
          fragmentShader={starfieldWashFragmentShader}
          uniforms={initialWashUniforms}
          transparent
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={materialRef}
          vertexShader={starfieldVertexShader}
          fragmentShader={starfieldFragmentShader}
          uniforms={initialUniforms}
          transparent
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </>
  );
}
