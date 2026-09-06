import { useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points } from 'three';
import { galaxyFragmentShader, galaxyVertexShader } from './galaxyShader';

export interface GalaxySceneProps {
  /** When true the scene is rendered exactly once and never animated. */
  reduced: boolean;
  /** Normalised scroll progress, 0 to 1, written by the Lenis driver. */
  scrollRef: MutableRefObject<number>;
}

// Composition constants.
//
// The disc is normalised to radius 1.0 in geometry space, so every framing
// number below is a multiple of the galaxy's own radius. What has to fit is
// not that radius but the visible reach of the outer arm, which the log
// spiral plus its radial fan carries to roughly 0.93 of a radius above the
// core on screen. At fov 50 and distance 4.7 the visible half height is
// tan(25deg) * 4.7 = 2.19, so with the core lifted OFFSET_Y above centre
// the arm crown lands about half a radius clear of the top edge, and the
// scroll push in of PUSH_IN plus the drift amplitude both stay inside that
// slack. The disc is framed whole at desktop width, arms included.
const CAM_DISTANCE = 4.7;
const PUSH_IN = 0.34;
// Disc tilt away from face on. Fully face on reads as a flat logo, fully
// edge on loses the arms entirely. This keeps both the arm structure and a
// real near/far depth spread across the frame.
const TILT_X = -0.78; // radians, so the disc is inclined 45 degrees from face on
const TILT_Z = 0.16;
// The page renders its cards down the centre of the viewport in a
// max-w-5xl column, so the core is pushed up and to the right, into the
// open upper right quadrant and off the card text, while the whole disc
// stays inside the frame. The offsets are deliberately larger than the
// arm reach in the two directions that have room to spare, which is what
// buys the top edge its clearance without shrinking the galaxy further.
// On a narrow viewport the cards go full width and there is no side margin
// to aim at, so the galaxy moves instead into the empty band above the
// page heading, which is the only open space left.
const OFFSET_X = 1.60;
const OFFSET_Y = 0.75;
const OFFSET_X_NARROW = 0.25;
const OFFSET_Y_NARROW = 1.24;

// Point budget. Measured on an Apple M4 at 1440x900 with the shared bloom,
// noise and vignette pipeline live. The small viewport tier follows the
// spirit of computeDpr in DepthStage.
const POINTS_DESKTOP = 60000;
const POINTS_SMALL = 24000;
const SMALL_VIEWPORT = 640;

const ARMS = 2;
// Log spiral tightness. theta = armOffset + SPIRAL_K * ln(r / R_INNER),
// which over the disc's radial span sweeps each arm through roughly 290
// degrees: enough to read unmistakably as a spiral without overlapping
// itself into a uniform haze.
const SPIRAL_K = 2.15;
const R_INNER = 0.10;
const CORE_FRACTION = 0.20;
const HALO_FRACTION = 0.14;

function easeInOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/** Deterministic pseudo random so the frozen reduced motion frame is stable. */
function makeRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Sum of uniforms, a cheap approximation of a normal distribution. */
function gauss(rand: () => number): number {
  return (rand() + rand() + rand() + rand() - 2) * 0.6;
}

function hash1(x: number): number {
  const s = Math.sin(x * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Value noise in one dimension, used to break the dust lanes and the arm
 * density up so the arms read as clumpy structure rather than as smooth
 * painted stripes.
 */
function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) * (1 - u) + hash1(i + 1) * u;
}

interface GalaxyBuffers {
  positions: Float32Array;
  props: Float32Array;
  count: number;
}

/**
 * Generates the entire galaxy once. Positions are stored as
 * (radius, height, angle0) in disc polar space, not as xyz, so the vertex
 * shader can apply differential rotation without any CPU work per frame.
 */
function buildGalaxy(count: number, seed: number): GalaxyBuffers {
  const rand = makeRandom(seed);
  const positions = new Float32Array(count * 3);
  const props = new Float32Array(count * 4);

  const coreCount = Math.floor(count * CORE_FRACTION);
  const haloCount = Math.floor(count * HALO_FRACTION);

  for (let i = 0; i < count; i++) {
    let radius: number;
    let angle: number;
    let height: number;
    let bright: number;
    let size: number;
    let tint = 0;

    if (i < coreCount) {
      // Central bulge. A steep power distribution piles most of these into
      // a very small radius, which is what makes the core read as a single
      // light source through bloom rather than as a bright blob.
      const u = rand();
      radius = Math.pow(u, 2.6) * 0.17;
      angle = rand() * Math.PI * 2;
      height = gauss(rand) * 0.030 * (1 - radius / 0.22);
      const core = 1 - radius / 0.17;
      bright = 0.030 + 0.62 * Math.pow(core, 2.4);
      size = 1.5 + 2.4 * Math.pow(core, 3.0);
    } else if (i < coreCount + haloCount) {
      // Unstructured halo. Faint, wide and thin, it fills the gaps between
      // the arms so the disc reads as a continuous object instead of two
      // isolated ribbons.
      const u = rand();
      radius = 0.12 + Math.pow(u, 0.55) * 0.94;
      angle = rand() * Math.PI * 2;
      height = gauss(rand) * (0.055 * Math.exp(-radius * 1.1));
      bright = 0.016 * (1 - radius * 0.55);
      size = 1.2 + rand() * 0.9;
      tint = Math.max(0, radius - 0.5);
    } else {
      // Spiral arm population.
      const u = rand();
      radius = R_INNER + Math.pow(u, 0.62) * 0.92;
      const armOffset = (Math.floor(rand() * ARMS) / ARMS) * Math.PI * 2;
      const spine = armOffset + SPIRAL_K * Math.log(radius / R_INNER);
      // Arms fan out with radius, which is what stops the outer disc from
      // looking like a wire and the inner disc from looking like a smear.
      const spread = 0.20 + 0.30 * radius;
      const offset = gauss(rand) * spread;
      angle = spine + offset;
      height = gauss(rand) * (0.045 * Math.exp(-radius * 1.15));

      // Brightness across the arm cross section: bright on the spine,
      // falling off to the edges.
      const across = Math.abs(offset) / spread;
      let profile = Math.exp(-across * across * 1.5);

      // Dust lanes. A real spiral has dark dust sitting on the inner,
      // trailing edge of each arm, so the darkening is keyed to a signed
      // offset rather than the absolute one. The noise term keeps the lane
      // from reading as a clean airbrushed stripe.
      const lane = (offset + spread * 0.34) / spread;
      const laneNoise = 0.55 + 0.45 * noise1(radius * 13.0 + armOffset * 3.0);
      const dust = Math.exp(-lane * lane * 11.0) * laneNoise * 0.95;
      profile *= 1 - dust;

      // Clumpy density along the arm, so the arms have knots of star
      // formation rather than a uniform glow.
      const clump = 0.55 + 0.75 * noise1(spine * 2.6 + radius * 6.5);
      profile *= clump;

      const fade = 1 - Math.pow(Math.max(0, (radius - 0.3) / 0.78), 2.1);
      bright = 0.115 * profile * Math.max(0.04, fade);
      size = 1.25 + rand() * 1.5 + 1.6 * Math.pow(rand(), 8);
      tint = Math.max(0, radius - 0.45);
    }

    positions[i * 3] = radius;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = angle;

    props[i * 4] = bright;
    props[i * 4 + 1] = Math.min(1, tint * 1.6);
    props[i * 4 + 2] = size;
    props[i * 4 + 3] = rand();
  }

  return { positions, props, count };
}

// Module scope singleton, matching BlackHoleScene: only one GalaxyScene is
// ever mounted, and keeping the uniform holder out of the component keeps
// the per frame writes off React's render path.
const uniforms = {
  uTime: { value: 0 },
  uScroll: { value: 0 },
  uPixelRatio: { value: 1 },
  uSizeScale: { value: 8.8 },
  uFocalDepth: { value: CAM_DISTANCE },
  uCocScale: { value: 1.35 },
  uExposure: { value: 1.0 },
};

export default function GalaxyScene({ reduced, scrollRef }: GalaxySceneProps) {
  const pointsRef = useRef<Points>(null);

  const geometry = useMemo(() => {
    const small = typeof window !== 'undefined' && window.innerWidth < SMALL_VIEWPORT;
    const built = buildGalaxy(small ? POINTS_SMALL : POINTS_DESKTOP, 20260906);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(built.positions, 3));
    geo.setAttribute('aProps', new BufferAttribute(built.props, 4));
    // The polar packing means a computed bounding sphere would be
    // meaningless, and the object is always on screen anyway, so culling is
    // disabled on the mesh and the sphere is set generously here.
    geo.computeBoundingSphere();
    if (geo.boundingSphere) geo.boundingSphere.radius = 4;
    return geo;
  }, []);

  useFrame((state) => {
    const camera = state.camera;
    uniforms.uPixelRatio.value = state.viewport.dpr;

    const narrow = state.size.width < 900;
    const offsetX = narrow ? OFFSET_X_NARROW : OFFSET_X;
    const offsetY = narrow ? OFFSET_Y_NARROW : OFFSET_Y;
    // Smaller viewports show a smaller slice of world space at the same
    // distance, so the camera pulls back to keep the whole disc framed.
    const aspect = state.size.width / Math.max(state.size.height, 1);
    const fit = aspect < 1.0 ? CAM_DISTANCE * (1.0 + (1.0 - aspect) * 0.85) : CAM_DISTANCE;

    if (reduced) {
      // Static path. The frozen frame is the fully composed image, not a
      // degraded one: same camera framing, same exposure, only time and
      // scroll stay at zero. No invalidate is scheduled, so with
      // frameloop="demand" this runs once at mount and then stops.
      camera.position.set(-offsetX, -offsetY, fit);
      camera.lookAt(-offsetX, -offsetY, 0);
      uniforms.uTime.value = 0;
      uniforms.uScroll.value = 0;
      return;
    }

    const t = state.clock.elapsedTime;
    const scroll = easeInOutCubic(scrollRef.current);

    uniforms.uTime.value = t;
    uniforms.uScroll.value = scroll;

    // Camera drift on two slow sines of different periods, so the motion
    // never repeats on an obvious beat, plus a scroll driven push in. The
    // drift is what makes the real z separation legible: near arm points
    // sweep visibly further across the frame than far ones.
    const driftX = Math.sin(t * 0.041) * 0.115;
    const driftY = Math.sin(t * 0.029 + 1.7) * 0.07;
    const distance = fit - PUSH_IN * scroll;

    camera.position.set(-offsetX + driftX, -offsetY + driftY, distance);
    camera.lookAt(-offsetX + driftX * 0.35, -offsetY + driftY * 0.35, 0);

    // The focal plane rides just in front of the core, so the near edge of
    // the disc softens as it passes the camera.
    uniforms.uFocalDepth.value = distance - 0.1;
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      frustumCulled={false}
      rotation={[TILT_X, 0, TILT_Z]}
    >
      <shaderMaterial
        vertexShader={galaxyVertexShader}
        fragmentShader={galaxyFragmentShader}
        uniforms={uniforms}
        transparent
        blending={AdditiveBlending}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
