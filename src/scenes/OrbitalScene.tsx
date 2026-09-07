import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  LinearSRGBColorSpace,
  Mesh,
} from 'three';
import {
  coreFragmentShader,
  coreVertexShader,
  haloFragmentShader,
  haloVertexShader,
  trailFragmentShader,
  trailVertexShader,
} from './orbitalShader';

export interface OrbitalSceneProps {
  /** When true the scene is rendered exactly once and never animated. */
  reduced: boolean;
  /** Normalised scroll progress, 0 to 1, written by the Lenis driver. */
  scrollRef: MutableRefObject<number>;
}

// ---------------------------------------------------------------------------
// Frame geometry.
//
// The camera never moves in this scene. It sits at z = CAM_Z looking straight
// down -z, exactly where DepthStage places it, and the only moving things in
// the frame are the bodies on their orbits. That is deliberate: the brief asks
// for one moving element against a still, dark frame, and a drifting camera
// would make every static element move too.
// ---------------------------------------------------------------------------
const CAM_Z = 1.0;

// Distance from the camera to the system's centre of mass. Chosen so that the
// z excursion an inclined orbit produces, roughly +/- 2 world units, is a
// large FRACTION of the viewing distance. That is what gives near bodies a
// visibly larger on-screen size than far ones, and it is what gives the depth
// buffer the spread the depth-of-field pass needs to have anything to do.
const SYS_DEPTH = 9.0;

// Tangent of the vertical frustum half angle at fov 50.
const NDC_TO_V = 0.4663;

const SMALL_VIEWPORT = 640;

// Where the centre of mass sits IN THE FRAME, in normalised device coords.
// The /work page is a centred max-w-3xl text column, which on a 1440 wide
// frame spans NDC x -0.53 to +0.53. The core is parked just outside that
// column's right edge, in the one part of the frame the page leaves empty.
// It is NOT pushed below the midline: the /work page is short enough that its
// footer band covers the bottom sixth of the viewport, and a low system loses
// its outer orbit behind it. Defined in NDC rather than in world units so
// the composition is pinned to the frame and not to a world angle.
const CENTRE_NDC_DESKTOP: [number, number] = [0.48, 0.02];
// A phone frame has no empty column, so the small-viewport placement lifts the
// system into the strip between the nav and the headline and shrinks it hard.
// Centred and full size, the core lands directly behind the headline, which is
// exactly the "focal point buried in the densest text" the composition brief
// warns about.
const CENTRE_NDC_SMALL: [number, number] = [0.02, 0.44];

// The whole system is scaled so the outermost apoapsis lands inside this
// fraction of the half frame, leaving the margin the composition brief asks
// for. Applied on both axes, smaller wins.
const FRAME_FIT_DESKTOP = 0.86;
const FRAME_FIT_SMALL = 0.88;

// ---------------------------------------------------------------------------
// The bodies.
//
// Five. Enough to read as a system with structure, few enough to stay inside
// the site's restraint. Every orbit is a real ellipse with the core at one
// FOCUS, not at the centre, and every one is inclined to a different plane, so
// no two bodies ever trace the same screen path.
//
// Units here are arbitrary and get multiplied by the frame-fit scale below.
// `rate` is the mean-motion multiplier: real orbital mechanics puts it at
// a^-1.5, which is what makes the inner body visibly quicker than the outer
// one without any of them looking hurried.
// ---------------------------------------------------------------------------
interface BodySpec {
  /** Semi-major axis. */
  a: number;
  /** Eccentricity. */
  e: number;
  /** Inclination in radians, tilt of the orbital plane out of the screen. */
  inc: number;
  /** Longitude of the ascending node in radians, spin of the tilt axis. */
  node: number;
  /** Argument of periapsis in radians, rotation within the orbital plane. */
  arg: number;
  /** Mean anomaly at t = 0. Also fixes the frozen reduced-motion pose. */
  phase: number;
  /** Body radius, same arbitrary units as `a`. */
  radius: number;
  /** Albedo, in LINEAR space. Never an sRGB hex. */
  albedo: [number, number, number];
  /** Trail arc length in radians of mean anomaly. */
  arc: number;
}

const D2R = Math.PI / 180;

const BODIES: BodySpec[] = [
  // Inner, quickest, smallest, and the one that spends time in front of the
  // core. Palest albedo so it stays legible against the halo.
  { a: 0.98, e: 0.16, inc: 24 * D2R, node: 32 * D2R, arg: 0.4, phase: 0.7,
    radius: 0.130, albedo: [0.52, 0.66, 0.74], arc: 2.35 },
  // Steeply inclined the other way, so it crosses the inner body's path on
  // screen while passing well in front of or behind it in depth.
  { a: 1.46, e: 0.30, inc: -39 * D2R, node: 112 * D2R, arg: 2.1, phase: 2.4,
    radius: 0.172, albedo: [0.30, 0.48, 0.56], arc: 2.15 },
  // The most steeply inclined orbit in the system: this is the body that
  // swings furthest toward and away from the camera, and the one the
  // depth-of-field pass has the most to say about.
  { a: 1.98, e: 0.13, inc: 56 * D2R, node: 201 * D2R, arg: 0.9, phase: 4.6,
    radius: 0.210, albedo: [0.34, 0.52, 0.62], arc: 1.95 },
  // Most eccentric, so its speed visibly surges through periapsis.
  { a: 2.46, e: 0.34, inc: -17 * D2R, node: -58 * D2R, arg: 4.0, phase: 1.3,
    radius: 0.158, albedo: [0.26, 0.42, 0.52], arc: 1.80 },
  // Outermost and slowest. Its trail is the longest arc in the frame and does
  // most of the work of describing the system's outer boundary.
  { a: 2.96, e: 0.21, inc: 41 * D2R, node: 152 * D2R, arg: 1.5, phase: 5.4,
    radius: 0.184, albedo: [0.28, 0.46, 0.55], arc: 1.70 },
];

// Base angular rate. The outermost body's period works out at roughly 175
// seconds, the innermost at roughly 33. Slow enough that the frame reads as
// still on a glance and only reveals itself as moving if you stay on it.
const RATE_BASE = 0.181;

// Depth exaggeration. The frame-fit scale that keeps the system inside the
// viewport also squashes its depth extent down to under a world unit, which
// leaves the depth-of-field pass almost nothing to separate. Stretching ONLY
// the z component of every orbit restores a real depth range without touching
// the composition, since x and y are untouched. Applied inside orbitPoint
// rather than as a group scale, which would squash the spheres into ellipsoids.
const Z_STRETCH =
  typeof window !== 'undefined' && window.innerWidth < SMALL_VIEWPORT ? 1.35 : 2.4;

// Trail tint, in LINEAR space. Ice cyan lifted toward white just enough that
// the ribbon reads as a lit streak rather than as a coloured line.
const TRAIL_TINT: [number, number, number] = [0.09, 0.42, 0.58];

// Trail sample counts. The ribbon is rebuilt every frame on the CPU, so this
// is the one number that trades smoothness for main-thread cost.
const TRAIL_SAMPLES_DESKTOP = 88;
const TRAIL_SAMPLES_SMALL = 44;

// Ribbon half width at the head, as a multiple of the body radius. It tapers
// to zero at the tail alongside the alpha decay.
const TRAIL_WIDTH = 0.26;

// Static orbit paths. The trail alone only ever shows an arc, so the shape of
// each orbit never resolves; the faint complete ellipse behind it is what
// makes the system read as a SYSTEM rather than as five streaks. Built once
// in the group's local space and never touched again, since the orbits
// themselves do not change, only the bodies' positions on them.
const PATH_SAMPLES_DESKTOP = 190;
const PATH_SAMPLES_SMALL = 96;
const PATH_WIDTH = 0.026;
const PATH_AMP = 0.085;

// The trail is drawn nudged this far toward the camera, as a fraction of the
// viewing distance. Trail and path lie on the SAME curve, so without the nudge
// they z-fight and the overlap shows up as a serrated band rather than as a
// trail. A camera-space nudge rather than a world z one, since the two ribbons
// have to separate along the view direction to stop fighting.
const TRAIL_DEPTH_NUDGE = 0.004;

// Core sphere radius and halo quad size, in the same pre-scale units.
const CORE_RADIUS = 0.30;
const HALO_SIZE = 3.2;

// Scroll response. The whole orbital group tips by this many radians across
// the full page scroll, which subtly opens or closes every orbit's projected
// ellipse. Kept tiny: the scene is not meant to be a scroll toy.
const SCROLL_TILT = 0.13;

// The depth-of-field focus wired into DepthStage.tsx is expressed as a world
// distance from the camera, and it is derived from CAM_Z and SYS_DEPTH above.
// It is duplicated as a literal there rather than exported from here, because
// a static import of this module from DepthStage would pull the whole orbital
// scene out of its own lazy chunk and into every route's bundle.

function easeInOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

/** Viewport aspect, floored so an absurdly tall frame cannot blow up the
 *  NDC to world conversion. Read once at mount, like StarfieldScene does. */
function viewportAspect(): number {
  if (typeof window === 'undefined' || !window.innerHeight) return 1.6;
  return Math.max(window.innerWidth / window.innerHeight, 0.35);
}

/** Colour from LINEAR components. Going through setRGB with an explicit
 *  colour space is what stops three's automatic sRGB to linear conversion
 *  from being applied a second time to values that are already linear. */
function linearColor(rgb: [number, number, number]): Color {
  return new Color().setRGB(rgb[0], rgb[1], rgb[2], LinearSRGBColorSpace);
}

/**
 * Solves Kepler's equation M = E - e sin E for the eccentric anomaly.
 * Three Newton steps is well converged at these eccentricities, and it is
 * what makes each body accelerate through periapsis instead of sliding
 * around its ellipse at a constant and obviously synthetic rate.
 */
function eccentricAnomaly(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 3; i++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

/** Precomputed per body, so the hot path does no trigonometry on constants. */
interface OrbitFrame {
  spec: BodySpec;
  a: number;
  b: number;
  focus: number;
  rate: number;
  cosArg: number;
  sinArg: number;
  cosInc: number;
  sinInc: number;
  cosNode: number;
  sinNode: number;
  radius: number;
  color: Color;
}

/** Position of a body at mean anomaly M, written into `out`. */
function orbitPoint(f: OrbitFrame, M: number, out: [number, number, number]): void {
  const E = eccentricAnomaly(M, f.spec.e);
  // Ellipse in its own plane with the attracting body at the origin focus.
  const px = f.a * Math.cos(E) - f.focus;
  const py = f.b * Math.sin(E);

  // Argument of periapsis: rotation inside the orbital plane.
  const vx = px * f.cosArg - py * f.sinArg;
  const vy = px * f.sinArg + py * f.cosArg;

  // Inclination: tip the plane about the screen-horizontal axis, which is
  // what pushes the orbit into and out of depth.
  const iy = vy * f.cosInc;
  const iz = vy * f.sinInc;

  // Ascending node: spin the tilted plane about the vertical axis, so no two
  // orbits share a tilt direction.
  out[0] = vx * f.cosNode + iz * f.sinNode;
  out[1] = iy;
  out[2] = (-vx * f.sinNode + iz * f.cosNode) * Z_STRETCH;
}

type Scratch = {
  p: [number, number, number];
  q: [number, number, number];
  t: [number, number, number];
};

interface Trail {
  geometry: BufferGeometry;
  positions: Float32Array;
  attr: BufferAttribute;
  samples: number;
}

/**
 * Builds a trail ribbon's static side: the vertex count, the fade attribute
 * and the index buffer. Only the positions are rewritten per frame.
 *
 * The ribbon is a triangle strip of `samples` rungs, two vertices each. The
 * fade attribute runs 0 at the tail to 1 at the head and drives both the
 * alpha decay in the fragment shader and the width taper on the CPU.
 */
function buildRibbon(samples: number): Trail {
  const positions = new Float32Array(samples * 2 * 3);
  const fades = new Float32Array(samples * 2);
  const indices = new Uint16Array((samples - 1) * 6);

  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    fades[i * 2] = t;
    fades[i * 2 + 1] = t;
  }
  for (let i = 0; i < samples - 1; i++) {
    const v = i * 2;
    const o = i * 6;
    indices[o] = v;
    indices[o + 1] = v + 1;
    indices[o + 2] = v + 2;
    indices[o + 3] = v + 1;
    indices[o + 4] = v + 3;
    indices[o + 5] = v + 2;
  }

  const geometry = new BufferGeometry();
  const attr = new BufferAttribute(positions, 3);
  attr.setUsage(35048); // DynamicDrawUsage, rewritten every frame.
  geometry.setAttribute('position', attr);
  geometry.setAttribute('aFade', new BufferAttribute(fades, 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  // The ribbon is rebuilt in place every frame, so a bounding sphere computed
  // once would go stale. Frustum culling is off on the mesh instead.
  geometry.boundingSphere = null;
  return { geometry, positions, attr, samples };
}

/**
 * Writes one ribbon rung: two vertices straddling `p`, offset along the
 * direction that is perpendicular to BOTH the curve's tangent and the view
 * direction. That cross product is what makes the ribbon face the camera.
 * Offsetting inside the xy plane instead, which is the obvious shortcut for a
 * camera that looks down -z, collapses to a flat edge-on plate wherever an
 * orbit is steeply inclined and its tangent is mostly depth.
 *
 * `nudge` slides the rung toward the camera along the view direction, which is
 * how the trail is kept off the orbit path it lies exactly on top of.
 */
function writeRung(
  pos: Float32Array,
  offset: number,
  p: [number, number, number],
  tangent: [number, number, number],
  centre: readonly [number, number, number],
  halfWidth: number,
  nudge: number,
): void {
  // View direction, from the camera to this point. The camera sits at
  // (0, 0, CAM_Z) and the ribbon's coordinates are local to the group, so the
  // group's centre has to be added back to get world space.
  const vx = p[0] + centre[0];
  const vy = p[1] + centre[1];
  const vz = p[2] + centre[2] - CAM_Z;

  let cx = tangent[1] * vz - tangent[2] * vy;
  let cy = tangent[2] * vx - tangent[0] * vz;
  let cz = tangent[0] * vy - tangent[1] * vx;
  const cl = Math.hypot(cx, cy, cz);
  if (cl > 1e-6) {
    cx /= cl;
    cy /= cl;
    cz /= cl;
  } else {
    cx = 1;
    cy = 0;
    cz = 0;
  }

  const vl = Math.hypot(vx, vy, vz) || 1;
  const nx = (vx / vl) * nudge;
  const ny = (vy / vl) * nudge;
  const nz = (vz / vl) * nudge;

  pos[offset] = p[0] - cx * halfWidth - nx;
  pos[offset + 1] = p[1] - cy * halfWidth - ny;
  pos[offset + 2] = p[2] - cz * halfWidth - nz;
  pos[offset + 3] = p[0] + cx * halfWidth - nx;
  pos[offset + 4] = p[1] + cy * halfWidth - ny;
  pos[offset + 5] = p[2] + cz * halfWidth - nz;
}

/**
 * Fills a ribbon with one complete orbit, and flattens its fade attribute to
 * a constant so the whole ellipse draws at one faint, even brightness.
 */
function fillOrbitPath(
  ribbon: Trail,
  f: OrbitFrame,
  halfWidth: number,
  centre: readonly [number, number, number],
  scratch: Scratch,
): void {
  const { p, q, t } = scratch;
  const n = ribbon.samples;
  const pos = ribbon.positions;
  for (let s = 0; s < n; s++) {
    const M = (s / (n - 1)) * Math.PI * 2;
    orbitPoint(f, M, p);
    orbitPoint(f, M + 0.02, q);
    t[0] = q[0] - p[0];
    t[1] = q[1] - p[1];
    t[2] = q[2] - p[2];
    writeRung(pos, s * 6, p, t, centre, halfWidth, 0);
  }
  const fade = ribbon.geometry.getAttribute('aFade') as BufferAttribute;
  (fade.array as Float32Array).fill(1);
  fade.needsUpdate = true;
  ribbon.attr.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// Ribbon store.
//
// The trail ribbons are rewritten in place on every frame, which is exactly
// what a value produced by useMemo or held in a ref must never be: one cannot
// be mutated, the other cannot be read while rendering, and the ribbons need
// both. So they live at module scope, the same place StarfieldScene,
// GalaxyScene and BlackHoleScene keep their mutable uniform singletons, and on
// the same premise: only one depth scene is ever mounted at a time.
// ---------------------------------------------------------------------------
interface RibbonStore {
  trails: Trail[];
  paths: Trail[];
}

let ribbonStore: RibbonStore | null = null;

function ensureRibbons(
  frames: OrbitFrame[],
  small: boolean,
  layout: { scale: number; centre: readonly [number, number, number] },
): RibbonStore {
  if (ribbonStore) return ribbonStore;
  const scratchLocal: Scratch = { p: [0, 0, 0], q: [0, 0, 0], t: [0, 0, 0] };
  ribbonStore = {
    trails: frames.map(() => buildRibbon(small ? TRAIL_SAMPLES_SMALL : TRAIL_SAMPLES_DESKTOP)),
    paths: frames.map((f) => {
      const ribbon = buildRibbon(small ? PATH_SAMPLES_SMALL : PATH_SAMPLES_DESKTOP);
      fillOrbitPath(ribbon, f, PATH_WIDTH * layout.scale, layout.centre, scratchLocal);
      return ribbon;
    }),
  };
  return ribbonStore;
}

/** Frees every ribbon geometry and clears the store, so that a remount at a
 *  different viewport size rebuilds rather than reusing stale geometry. */
function disposeRibbons(): void {
  if (!ribbonStore) return;
  for (const t of ribbonStore.trails) t.geometry.dispose();
  for (const t of ribbonStore.paths) t.geometry.dispose();
  ribbonStore = null;
}

export default function OrbitalScene({ reduced, scrollRef }: OrbitalSceneProps) {
  const groupRef = useRef<Group>(null);
  const bodyRefs = useRef<Array<Mesh | null>>([]);

  const small = useMemo(
    () => typeof window !== 'undefined' && window.innerWidth < SMALL_VIEWPORT,
    [],
  );

  // Frame fit. Everything below is derived once at mount from the real
  // viewport, so the system lands whole inside the frame with margin at any
  // aspect rather than only at the one the constants were tuned on.
  const layout = useMemo(() => {
    const aspect = viewportAspect();
    const halfWorldY = NDC_TO_V * SYS_DEPTH;
    const halfWorldX = halfWorldY * aspect;
    const [cxNdc, cyNdc] = small ? CENTRE_NDC_SMALL : CENTRE_NDC_DESKTOP;
    const fitFrac = small ? FRAME_FIT_SMALL : FRAME_FIT_DESKTOP;

    // Largest distance any body reaches from the core, before scaling, split
    // into the in-frame extent and the depth extent.
    let reachXY = 0;
    let reachZ = 0;
    for (const b of BODIES) {
      const apo = b.a * (1 + b.e);
      reachXY = Math.max(reachXY, apo + b.radius);
      reachZ = Math.max(reachZ, apo * Math.abs(Math.sin(b.inc)) * Z_STRETCH + b.radius);
    }

    const roomX = (fitFrac - Math.abs(cxNdc)) * halfWorldX;
    const roomY = (fitFrac - Math.abs(cyNdc)) * halfWorldY;

    // Solve for the scale directly rather than dividing room by reach. The
    // nearest point of the system sits at depth SYS_DEPTH - scale * reachZ,
    // and perspective magnifies it by SYS_DEPTH / that depth, so a naive fit
    // computed at the centre-of-mass depth lets the near arcs swing out of
    // frame. Requiring scale * reachXY * magnification <= room and solving
    // the resulting linear equation gives the closed form below.
    const fit = (room: number) =>
      (room * SYS_DEPTH) / (reachXY * SYS_DEPTH + room * reachZ);
    const scale = Math.max(0.15, Math.min(fit(roomX), fit(roomY)));

    return {
      scale,
      centre: [cxNdc * halfWorldX, cyNdc * halfWorldY, CAM_Z - SYS_DEPTH] as const,
    };
  }, [small]);

  const frames = useMemo<OrbitFrame[]>(
    () =>
      BODIES.map((spec) => {
        const a = spec.a * layout.scale;
        return {
          spec,
          a,
          b: a * Math.sqrt(1 - spec.e * spec.e),
          focus: a * spec.e,
          rate: RATE_BASE / Math.pow(spec.a, 1.5),
          cosArg: Math.cos(spec.arg),
          sinArg: Math.sin(spec.arg),
          cosInc: Math.cos(spec.inc),
          sinInc: Math.sin(spec.inc),
          cosNode: Math.cos(spec.node),
          sinNode: Math.sin(spec.node),
          radius: spec.radius * layout.scale,
          color: linearColor(spec.albedo),
        };
      }),
    [layout],
  );

  // Module-free scratch, allocated once: nothing in the per-frame path
  // allocates, so the animation never triggers a collection.
  const scratch = useRef<Scratch>({ p: [0, 0, 0], q: [0, 0, 0], t: [0, 0, 0] });

  const { trails, paths } = ensureRibbons(frames, small, layout);

  // Ribbon geometries are built imperatively rather than declared in JSX, so
  // r3f does not own them and they must be disposed by hand on unmount.
  useEffect(() => disposeRibbons, []);

  const trailUniforms = useMemo(
    () =>
      frames.map(() => ({
        uColor: { value: linearColor(TRAIL_TINT) },
        uAmp: { value: 0.55 },
      })),
    [frames],
  );

  const pathUniforms = useMemo(
    () => ({ uColor: { value: linearColor(TRAIL_TINT) }, uAmp: { value: PATH_AMP } }),
    [],
  );

  const haloUniforms = useMemo(() => ({ uAmp: { value: 0.42 } }), []);

  /** Writes every body position and rebuilds every trail ribbon for time t. */
  const poseAt = (t: number) => {
    const centre = layout.centre;
    const ribbons = ribbonStore;
    const { p, q, t: tan } = scratch.current;
    const nudge = SYS_DEPTH * TRAIL_DEPTH_NUDGE;
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const M = f.spec.phase + f.rate * t;

      const mesh = bodyRefs.current[i];
      if (mesh) {
        orbitPoint(f, M, p);
        mesh.position.set(p[0], p[1], p[2]);
      }

      const trail = ribbons ? ribbons.trails[i] : null;
      if (!trail) continue;
      const pos = trail.positions;
      const n = trail.samples;
      const halfWidth = f.radius * TRAIL_WIDTH;

      for (let s = 0; s < n; s++) {
        const u = s / (n - 1); // 0 at the tail, 1 at the head.
        const Ms = M - f.spec.arc * (1 - u);
        orbitPoint(f, Ms, p);
        // Tangent from a short step along the orbit, used to find the
        // camera-facing perpendicular the ribbon is widened along.
        orbitPoint(f, Ms + 0.02, q);
        tan[0] = q[0] - p[0];
        tan[1] = q[1] - p[1];
        tan[2] = q[2] - p[2];
        // Width tapers with the same curve the alpha uses, so the ribbon
        // dissolves rather than ending on a visible squared-off tail.
        writeRung(pos, s * 6, p, tan, centre, halfWidth * u * u, nudge);
      }
      trail.attr.needsUpdate = true;
    }
  };

  useFrame((state) => {
    const group = groupRef.current;

    if (reduced) {
      // Static path. The frozen frame is the fully composed image: bodies sit
      // at their t = 0 mean anomalies and every trail is present as a static
      // arc, not absent. No invalidate is scheduled, so under
      // frameloop="demand" this runs once at mount and then stops.
      if (group) group.rotation.x = 0;
      poseAt(0);
      return;
    }

    const t = state.clock.elapsedTime;
    if (group) group.rotation.x = easeInOutCubic(scrollRef.current) * SCROLL_TILT;
    poseAt(t);
  });

  const segW = small ? 20 : 40;
  const segH = small ? 14 : 28;
  const coreRadius = CORE_RADIUS * layout.scale;
  const haloSize = HALO_SIZE * layout.scale;

  return (
    <>
      {/* Lit by the core itself, which is what puts a crescent terminator on
          every body and makes the far side of each orbit fall into shadow.
          The tiny ambient keeps unlit limbs from crushing to pure black. */}
      <ambientLight color={linearColor([0.05, 0.09, 0.12])} intensity={1.0} />
      {/* Camera-side fill. Without it every body facing away from the core
          collapses to a black disc: physically honest, but it erases the
          bodies from the frame entirely. Kept dim and cool so the crescent
          terminator the core light casts still reads as the primary form. */}
      <directionalLight
        position={[layout.centre[0] * 0.3, layout.centre[1] + 2, CAM_Z + 4]}
        color={linearColor([0.10, 0.24, 0.34])}
        intensity={2.2}
      />
      <pointLight
        position={layout.centre}
        color={linearColor([0.03, 0.46, 0.66])}
        intensity={3.2}
        distance={0}
        // Inverse-LINEAR falloff, not the physical inverse square. Across the
        // system's radius the physical law spans a factor of thirty in
        // irradiance, which pins the inner bodies at pure white well over the
        // Bloom threshold while the outer ones vanish. Linear decay keeps the
        // whole spread inside one exposure so every body has visible form, and
        // leaves the core as the only thing in the frame that blooms.
        decay={1}
      />

      {/* Core and halo sit outside the tilting group, so the halo quad stays
          square to the camera no matter how far the scroll tips the system. */}
      <mesh position={layout.centre}>
        <sphereGeometry args={[coreRadius, segW, segH]} />
        <shaderMaterial
          vertexShader={coreVertexShader}
          fragmentShader={coreFragmentShader}
          toneMapped={false}
        />
      </mesh>
      <mesh position={layout.centre} renderOrder={2}>
        <planeGeometry args={[haloSize, haloSize]} />
        <shaderMaterial
          vertexShader={haloVertexShader}
          fragmentShader={haloFragmentShader}
          uniforms={haloUniforms}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <group ref={groupRef} position={layout.centre}>
        {frames.map((f, i) => (
          <mesh
            key={i}
            ref={(m) => {
              bodyRefs.current[i] = m;
            }}
          >
            {/* Opaque, depth tested and depth writing, which is the whole
                point of this scene: it is the first of the four to produce a
                real, varying depth buffer for the DoF pass to read. */}
            <sphereGeometry args={[f.radius, segW, segH]} />
            <meshStandardMaterial
              color={f.color}
              roughness={0.62}
              metalness={0.12}
            />
          </mesh>
        ))}
        {paths.map((path, i) => (
          <mesh key={`p${i}`} geometry={path.geometry} frustumCulled={false} renderOrder={0}>
            <shaderMaterial
              vertexShader={trailVertexShader}
              fragmentShader={trailFragmentShader}
              uniforms={pathUniforms}
              transparent
              side={DoubleSide}
              blending={AdditiveBlending}
              depthWrite
              toneMapped={false}
            />
          </mesh>
        ))}
        {trails.map((trail, i) => (
          <mesh key={i} geometry={trail.geometry} frustumCulled={false} renderOrder={1}>
            <shaderMaterial
              vertexShader={trailVertexShader}
              fragmentShader={trailFragmentShader}
              uniforms={trailUniforms[i]}
              transparent
              side={DoubleSide}
              blending={AdditiveBlending}
              // Depth writing is ON for both ribbon layers, unlike the additive
              // point clouds in the other scenes. Additive blending is order
              // independent so this costs nothing in colour, and it is what
              // gives the depth-of-field pass a real distance for every ribbon
              // pixel instead of the background's far-plane depth.
              depthWrite
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}
