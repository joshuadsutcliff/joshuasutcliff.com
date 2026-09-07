// GLSL for the "/" home depth parallax starfield.
//
// Like the /projects galaxy this scene is real geometry: one BufferGeometry
// of points sitting at real depths, generated once on the CPU. Unlike the
// galaxy, the position attribute here holds ordinary world xyz rather than a
// polar packing, because the whole point of this scene is that the stars sit
// on a handful of DISCRETE z planes and never move relative to each other.
// All of the motion is the camera translating in front of them, which is what
// makes the parallax real rather than simulated.
//
// Attribute layout, all generated once at mount:
//   position  -> vec3(x, y, z) in world space. z is one of the plane depths
//                plus a small jitter.
//   aProps    -> vec4(brightness, size, seed, depthNorm)
//                depthNorm is 0 at the nearest plane and 1 at the farthest,
//                and drives both the cool colour shift and the extra dimming
//                that sells distance beyond what 1/z alone gives.

export const starfieldVertexShader = /* glsl */ `
precision highp float;

attribute vec4 aProps;

uniform float uTime;
uniform float uScroll;
uniform float uPixelRatio;
uniform float uSizeScale;
uniform float uFocalDepth;
uniform float uCocScale;

varying float vBright;
varying float vDepth;
varying float vCoc;
varying float vAnchor;

void main() {
  // Scroll drifts the whole field downward very slightly, so moving down the
  // page feels like rising through the field. The near planes are pushed more
  // than the far ones, so even the scroll response is parallaxed.
  float push = uScroll * 0.55 * (1.0 - aProps.w * 0.78);
  vec3 worldPos = position + vec3(0.0, -push, 0.0);

  vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float viewDepth = -mvPosition.z;

  // In shader circle of confusion, the same technique the galaxy uses. The
  // points are additively blended with depth writes off, so the depth buffer
  // is uniform and a post pass depth of field has nothing to read from.
  float coc = clamp(abs(viewDepth - uFocalDepth) * uCocScale, 0.0, 1.0);
  vCoc = coc;

  // Perspective size falloff does most of the depth cue work: a star on the
  // near plane is several times the diameter of one on the far plane. The coc
  // term widens defocused sprites on top of that.
  float size = aProps.y * (1.0 + coc * 0.75);
  gl_PointSize = size * uPixelRatio * uSizeScale / max(viewDepth, 0.6);
  gl_PointSize = clamp(gl_PointSize, 0.8, 20.0);

  // Twinkle. Deliberately tiny and slow, and keyed to a per star seed so no
  // two neighbours pulse together. This is the only motion in the scene that
  // is not the camera, and it is held well under the threshold where the
  // frame starts to read as busy.
  //
  // Anchor stars are flagged by a NEGATIVE seed and are frozen outright.
  // They are the handful of stars bright enough to clear the shared Bloom
  // luminance threshold, and a bloomed sprite whose brightness oscillates by
  // ten percent does not read as twinkle, it reads as a pulsing light.
  float seed = abs(aProps.z);
  float twinkleAmp = aProps.z < 0.0 ? 0.0 : 0.10;
  float twinkle = 1.0 + twinkleAmp * sin(uTime * 0.55 + seed * 62.83);
  vAnchor = aProps.z < 0.0 ? 1.0 : 0.0;

  // Energy is conserved as a defocused sprite spreads out.
  vBright = aProps.x * twinkle / (1.0 + coc * 1.4);
  vDepth = aProps.w;
}
`;

export const starfieldFragmentShader = /* glsl */ `
precision highp float;

varying float vBright;
varying float vDepth;
varying float vCoc;
varying float vAnchor;

uniform float uExposure;

// Palette. These are the LINEAR values of the design tokens, not their sRGB
// hex components, and they are copied verbatim from the galaxy and black hole
// shaders for exactly the reason documented there: the renderer encodes this
// shader's output to sRGB on the way to the screen, so feeding it the raw hex
// components lifts every dark area and washes the page out.
const vec3 ICE_CYAN    = vec3(0.00854, 0.38656, 0.55261); // #17a7c4
const vec3 COOL_PURPLE = vec3(0.10470, 0.07829, 0.67205); // #5b4fd6

void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;

  // Gaussian sprite. A focused star keeps a tight bright kernel, a defocused
  // one flattens toward an even disc.
  //
  // Anchors get a deliberately softer kernel. A hard two pixel core clears
  // the Bloom threshold on paper but gives the mipmap blur almost nothing to
  // work with, so the star reads as a slightly brighter dot instead of a
  // star that glows. Softening spreads the above threshold region across
  // most of the sprite, which is what actually produces the halo.
  float sharp = mix(mix(10.0, 3.4, vCoc), 6.0, vAnchor);
  float falloff = exp(-r2 * sharp * 4.0);

  // Colour by distance. Near stars are near white with only a hint of cyan,
  // and the field cools toward ice cyan as it recedes, which is the classic
  // aerial perspective cue. The purple is the rare use token: it is only ever
  // mixed into the farthest plane and at a weight low enough that it never
  // reads as a second hue.
  vec3 near = vec3(0.92, 0.97, 1.0);
  vec3 col = mix(near, ICE_CYAN, smoothstep(0.10, 0.85, vDepth));
  col = mix(col, COOL_PURPLE, 0.16 * smoothstep(0.80, 1.0, vDepth));

  gl_FragColor = vec4(col * vBright * falloff * uExposure, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Nebular wash.
//
// A single quad sitting far behind every star plane, carrying a very low
// opacity haze keyed to the SAME band function the CPU used to place the
// stars. Its job is tonal: it gives the band somewhere to sit instead of
// leaving it as a density change alone, and it puts a soft glow under the
// core bulge so that region reads as a place rather than as a clump.
//
// There is deliberately no uTime uniform here. The wash cannot animate, which
// means it can never break the reduced motion single frame guarantee.
// ---------------------------------------------------------------------------

export const starfieldWashVertexShader = /* glsl */ `
precision highp float;

varying vec2 vAngular;

uniform float uWashDepth;

void main() {
  // Angular coordinates, matching the (u, v) = (x / depth, y / depth) space
  // the star band was sampled in, so the wash and the stars describe exactly
  // the same band on screen.
  vAngular = position.xy / uWashDepth;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const starfieldWashFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vAngular;

uniform float uNdcToU;
uniform float uWashAmp;
uniform float uCoreAmp;

// Same linear space token values as the star shader. Never the sRGB hex.
const vec3 ICE_CYAN    = vec3(0.00854, 0.38656, 0.55261); // #17a7c4
const vec3 COOL_PURPLE = vec3(0.10470, 0.07829, 0.67205); // #5b4fd6

// Identical to the constants the CPU side samples the star band with, in the
// same NDC space, so the haze and the stars describe one band.
const float NDC_TO_V     = 0.4663;
const float BAND_SLOPE   = 0.82;
const float BAND_OFFSET  = 0.045;
const float BAND_SIGMA   = 0.290;
const float RIFT_OFFSET  = -0.086;
const float RIFT_SIGMA   = 0.073;
const float RIFT_DEPTH   = 0.85;
const float BULGE_X      = 0.50;
const float BULGE_SIGMA  = 0.40;

float hash1(float n) {
  return fract(sin(n * 127.1) * 43758.5453123);
}

float vnoise(float x) {
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash1(i), hash1(i + 1.0), f);
}

void main() {
  float nx = vAngular.x / uNdcToU;
  float ny = vAngular.y / NDC_TO_V;
  float d = ny - BAND_SLOPE * nx - BAND_OFFSET;

  // Irregular half width, matching the CPU side in character if not bit for
  // bit: the wash only has to agree with the stars at the scale the eye
  // integrates over, which is far coarser than a single star.
  float sigma = BAND_SIGMA * (0.72 + 0.62 * vnoise(nx * 1.7 + 11.0));
  float band = exp(-(d / sigma) * (d / sigma));

  float riftOff = RIFT_OFFSET + 0.039 * (vnoise(nx * 2.3 + 4.0) - 0.5) * 2.0;
  float rd = (d - riftOff) / RIFT_SIGMA;
  float rift = 1.0 - RIFT_DEPTH * exp(-rd * rd);

  // Local voids, so the haze is mottled rather than an airbrushed gradient.
  float mottle = 0.72 + 0.42 * vnoise(nx * 4.2 + 31.0) * vnoise(ny * 6.9 + 3.0);

  float bu = (nx - BULGE_X) / BULGE_SIGMA;
  float bulge = exp(-bu * bu);

  // The core glow is tighter than the band and is not cut by the dust lane,
  // which is what lets it resolve as a single soft object.
  float cu = (nx - BULGE_X) / 0.27;
  float cv = d / 0.247;
  float core = exp(-(cu * cu + cv * cv));

  // A second, much tighter term inside the first. One broad gaussian reads
  // as a smudge; a tight kernel nested in a broad halo is what makes the
  // eye resolve a core as a thing with a centre.
  float ku = (nx - BULGE_X) / 0.115;
  float kv = d / 0.100;
  core += 0.60 * exp(-(ku * ku + kv * kv));

  // The haze ramps in along the band rather than filling it evenly, so the
  // tonal weight collects around the core in the frame's dead space and the
  // band's lower leg stays stars only, which is where the hero type lives.
  // The floor keeps a trace of haze down the band's lower leg so it reads as
  // crossing the whole frame, while 82 percent of the tonal weight still
  // collects around the core.
  float along = 0.18 + 0.82 * smoothstep(-1.35, 0.22, nx);

  float haze = band * rift * mottle * along * (1.0 + 0.9 * bulge);

  vec3 col = ICE_CYAN * (uWashAmp * haze + uCoreAmp * core);
  // Whisper of the rare use purple, only in the deepest part of the core.
  col += COOL_PURPLE * uCoreAmp * 0.22 * core * core;

  gl_FragColor = vec4(col, 1.0);
}
`;
