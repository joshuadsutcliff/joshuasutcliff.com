// GLSL for the /about gravitational lensing scene.
//
// The fragment shader integrates a light ray backwards from the camera
// through a Schwarzschild-like potential. Everything visible (the
// Einstein ring, the far side of the disk arcing over the top of the
// shadow, the photon ring, the smeared starfield) falls out of that
// single integration rather than being painted in by hand.
//
// Units: the Schwarzschild radius is 1.0, so the shadow sits at roughly
// r = 2.6 and the disk spans r = 3.0 to r = 11.0.

export const blackHoleVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  // Fullscreen quad: bypass the camera entirely and emit clip space
  // coordinates directly, so the plane always covers the viewport.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const blackHoleFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform vec3  uCamPos;
uniform float uFov;
uniform float uScroll;
uniform float uSpin;
uniform float uSteps;
uniform vec2  uPointer;

// Palette. These are the only colours in the scene.
//
// These are the LINEAR values of the design tokens, not their sRGB hex
// components. The renderer encodes this shader's output to sRGB on the way
// to the screen, so feeding it the raw hex components lifted every dark
// area: #07090f was landing on screen at roughly #2b2f3a, which is what
// washed the page out behind the content panels.
const vec3 VOID_COLOR   = vec3(0.00209, 0.00271, 0.00479); // #07090f
const vec3 ICE_CYAN     = vec3(0.00854, 0.38656, 0.55261); // #17a7c4
const vec3 COOL_PURPLE  = vec3(0.10470, 0.07829, 0.67205); // #5b4fd6

const float RS         = 1.0;   // Schwarzschild radius
const float HORIZON    = 1.02;  // capture radius, slightly outside RS
const float DISK_INNER = 3.0;
const float DISK_OUTER = 11.0;
const float ESCAPE_R   = 46.0;
const int   MAX_STEPS  = 180;

// Exposure tuning. These are the knobs that decide whether the frame reads
// as a restrained luminous focal point or as a blown out white flood.
const float DISK_GAIN  = 0.78;  // overall disk radiance multiplier
const float DISK_LIP   = 1.30;  // hot inner lip radiance
// Screen radius of the shadow, as the impact parameter the overlay is
// projected from. The analytic value is 2.598 RS, but the weak field march
// above captures at a visibly larger radius, so this is matched to the
// silhouette the march actually produces (measured off a luminance scan of
// a rendered frame). Keeping the ring on the real edge is what stops it
// reading as a bright donut floating inside a dark gap.
const float PHOTON_B   = 3.600;
const float RING_WIDTH = 0.0034;
const float RING_GAIN  = 1.70;
const float STAR_GAIN  = 1.70;
// Screen position of the shadow centre, as a fraction of the viewport.
// The About page fills the middle with near opaque panels, so on a wide
// viewport the focal point is pushed into the open sky at the top right,
// where the shadow and the photon ring clear the hero panel's corner.
// On a narrow viewport the panels go full width and there is no side
// margin to aim at, so the composition recentres and drops slightly.
const float FRAME_X    = 0.865;
const float FRAME_Y    = 0.225;
const float FRAME_X_N  = 0.500;
const float FRAME_Y_N  = 0.240;

float hash11(float n) {
  return fract(sin(n * 78.233) * 43758.5453123);
}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

// Procedural starfield sampled through the bent ray direction. One star
// per grid cell keeps the cost to a single hash lookup per octave, and
// because the direction is the post-lensing one the field arcs and
// smears around the shadow on its own.
float starLayer(vec3 dir, float density, float sharpness) {
  vec3 p = dir * density;
  vec3 cell = floor(p);
  vec3 f = p - cell;
  float h = hash13(cell);
  if (h < 0.82) return 0.0;
  vec3 offset = vec3(
    hash11(h * 13.1),
    hash11(h * 27.7),
    hash11(h * 41.3)
  );
  float d = length(f - offset);
  float star = smoothstep(sharpness, 0.0, d);
  float brightness = 0.35 + 0.65 * hash11(h * 91.7);
  return star * star * brightness;
}

vec3 starfield(vec3 dir) {
  float s = starLayer(dir, 46.0, 0.16) * 1.0;
  s += starLayer(dir, 92.0, 0.11) * 0.55;
  s += starLayer(dir, 168.0, 0.08) * 0.28;
  // Stars are near white with a faint ice cyan bias so they sit in palette.
  vec3 tint = mix(vec3(1.0), ICE_CYAN, 0.35);
  return tint * s * STAR_GAIN;
}

// Disk emission for a point at radius r in the equatorial plane.
// The inner edge runs hot white, falling off through ice cyan outward.
vec3 diskColor(float r) {
  float t = clamp((r - DISK_INNER) / (DISK_OUTER - DISK_INNER), 0.0, 1.0);
  vec3 hot = mix(vec3(1.0, 1.0, 1.0), vec3(0.72, 0.95, 1.0), smoothstep(0.0, 0.28, t));
  vec3 cool = mix(hot, ICE_CYAN, smoothstep(0.18, 0.85, t));
  // A very small purple term at the outermost edge only, kept faint so it
  // can never dominate the frame.
  cool = mix(cool, COOL_PURPLE, 0.16 * smoothstep(0.72, 1.0, t));
  return cool;
}

// Radial brightness profile: bright just outside the inner edge, fading
// out toward the rim.
float diskIntensity(float r) {
  float t = clamp((r - DISK_INNER) / (DISK_OUTER - DISK_INNER), 0.0, 1.0);
  float inner = smoothstep(0.0, 0.09, t);
  float outer = 1.0 - smoothstep(0.42, 1.0, t);
  return inner * outer;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  // Framing offset. The page content sits in dark panels down the middle
  // of the viewport, so the focal point is pushed to roughly 55 percent of
  // the width and 45 percent of the height, matching the composition the
  // canvas 2D version used. p is ray space: the shadow centre sits at
  // p = 0, which lands at that offset on screen.
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float wide = smoothstep(0.75, 1.35, aspect);
  float frameX = mix(FRAME_X_N, FRAME_X, wide);
  float frameY = mix(FRAME_Y_N, FRAME_Y, wide);
  vec2 center = vec2((frameX - 0.5) * aspect, 0.5 - frameY);
  vec2 p = uv - center;

  // Cursor driven lensing perturbation: a small extra deflection of the
  // rays nearest the shadow, tracking the eased pointer. The weight is a
  // Gaussian about the singularity roughly two photon ring radii wide, so
  // the warp is local to the focal point and the wider composition never
  // moves. Both the ray march and the photon ring overlay read p, so the
  // shadow, disk and ring bend together. Kept deliberately small.
  float ptrWeight = exp(-dot(p, p) / 0.045);
  p += uPointer * 0.008 * ptrWeight;

  // Camera basis, always looking at the singularity.
  vec3 forward = normalize(-uCamPos);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up = cross(forward, right);
  float focal = 1.0 / tan(0.5 * uFov);
  vec3 dir = normalize(forward * focal + right * p.x + up * p.y);

  vec3 pos = uCamPos;

  // Conserved angular momentum term for the weak field deflection.
  vec3 angular = cross(pos, dir);
  float h2 = dot(angular, angular);

  vec3 color = vec3(0.0);
  float alphaLeft = 1.0;
  bool captured = false;
  bool escaped = false;

  // Per pixel dither on the first step to break up banding in the
  // disk crossings without adding visible noise.
  float dither = hash13(vec3(gl_FragCoord.xy, 1.0));
  float steps = clamp(uSteps, 40.0, float(MAX_STEPS));

  for (int i = 0; i < MAX_STEPS; i++) {
    if (float(i) >= steps) break;
    if (captured || escaped) break;

    float r = length(pos);
    float dt = 0.055 + 0.052 * r;
    if (i == 0) dt *= 0.55 + 0.45 * dither;

    vec3 prevPos = pos;

    // Weak field geodesic step. The 1.5 h^2 / r^5 term is the standard
    // Schwarzschild light bending acceleration.
    vec3 accel = -1.5 * h2 * pos / pow(dot(pos, pos), 2.5);
    pos += dir * dt;
    dir = normalize(dir + accel * dt);

    // Equatorial plane crossing: interpolate to the exact intersection.
    if (prevPos.y * pos.y < 0.0) {
      float k = prevPos.y / (prevPos.y - pos.y);
      vec3 hit = mix(prevPos, pos, k);
      float hr = length(hit);
      if (hr > DISK_INNER && hr < DISK_OUTER) {
        // Keplerian orbital velocity, prograde about +Y.
        vec3 orbitDir = normalize(cross(vec3(0.0, 1.0, 0.0), hit));
        float beta = 0.52 * sqrt(RS / hr);
        // Doppler beaming: the approaching side is measurably brighter.
        float g = 1.0 / max(0.12, 1.0 - beta * dot(orbitDir, dir));
        float doppler = pow(g, 2.7);

        float ang = atan(hit.z, hit.x);
        // Slow differential rotation of the emitting material, plus a
        // gentle spiral banding so the disk reads as moving matter. The
        // band amplitude is kept low so it cannot mask the Doppler
        // asymmetry between the two sides of the disk.
        float phase = ang * 3.0 - uSpin * (2.4 / sqrt(hr)) + hr * 0.55;
        float bands = 0.90 + 0.10 * sin(phase);
        float grain = 0.88 + 0.12 * sin(phase * 3.7 + hr * 2.1);

        float intensity = diskIntensity(hr) * bands * grain * doppler;
        vec3 emit = diskColor(hr) * intensity;

        // Hot inner lip. The filmic roll off at the end of main saturates
        // this gracefully instead of clipping it to flat white.
        emit += vec3(1.0, 0.98, 0.95) * DISK_LIP * doppler *
                (1.0 - smoothstep(DISK_INNER, DISK_INNER + 0.9, hr)) *
                smoothstep(DISK_INNER - 0.15, DISK_INNER + 0.12, hr);

        // Semi transparent so overlapping passes (the far side arcing
        // over the top of the shadow) stack rather than replace.
        float opacity = clamp(0.55 * diskIntensity(hr) + 0.12, 0.0, 0.92);
        color += emit * alphaLeft * DISK_GAIN;
        alphaLeft *= 1.0 - opacity;
      }
    }

    if (length(pos) < HORIZON) captured = true;
    if (length(pos) > ESCAPE_R) escaped = true;
  }

  if (!captured) {
    color += starfield(normalize(dir)) * alphaLeft;
  }

  // Photon ring: a thin bright ring hugging the shadow. Its screen radius
  // is the exact projection of the capture impact parameter, so it lands
  // on the marched shadow edge rather than merely near it.
  float camDist = length(uCamPos);
  float photonB = PHOTON_B * RS;
  float ringRadius = photonB * focal / sqrt(max(camDist * camDist - photonB * photonB, 1.0));
  float rPix = length(p);
  float ring = exp(-pow(abs(rPix - ringRadius) / RING_WIDTH, 2.0));
  color += mix(vec3(1.0), ICE_CYAN, 0.28) * ring * RING_GAIN;

  // Faint cool rim just outside the ring. This is the only other purple
  // in the frame and it is deliberately weak.
  float rim = exp(-pow(abs(rPix - ringRadius * 1.13) / (RING_WIDTH * 8.0), 2.0));
  color += COOL_PURPLE * rim * 0.09;

  // Scroll driven exposure lift, subtle by design.
  float exposure = 1.0 + 0.14 * uScroll;
  color *= exposure;

  // Filmic roll off. Everything above is unbounded radiance; this maps it
  // into 0 to 1 so the hot core saturates gracefully instead of clipping
  // the whole disk to flat white.
  color = vec3(1.0) - exp(-color);

  // Sit the whole thing on the void colour rather than pure black.
  color += VOID_COLOR * (0.9 + 0.1 * sin(uTime * 0.05));

  // Vignette toward the void so page content stays readable at the edges.
  // Deliberately keyed off the screen centred uv, not the offset ray space.
  float vig = 1.0 - 0.42 * smoothstep(0.35, 1.15, length(uv));
  color = mix(VOID_COLOR, color, vig);

  gl_FragColor = vec4(color, 1.0);
}
`;
