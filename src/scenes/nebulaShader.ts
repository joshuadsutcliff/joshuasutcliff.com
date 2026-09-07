// GLSL for the /resume volumetric nebula.
//
// The fragment shader marches a bounded number of steps through a 3D density
// field. The field is not uniform fog: it is an envelope shaped around a
// single luminous core, modulated by fbm turbulence and then carved by a
// ridged noise term that produces dark dust lanes. Everything visible (the
// lit rim on the core facing side of the gas, the lanes cutting across it,
// the cooler and fainter gas further back) falls out of that march.
//
// Both the step count and the octave count are uniform driven with hard
// compile time caps, so performance can be tuned without touching the
// shader structure. There are no unbounded loops.

export const nebulaVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  // Fullscreen quad: emit clip space directly so the plane always covers the
  // viewport regardless of the shared camera rig.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const nebulaFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform float uScroll;
uniform float uDrift;
uniform float uSteps;
uniform float uOctaves;
uniform float uGain;

// Palette. These are the LINEAR values of the design tokens, not their sRGB
// hex components, and they are copied verbatim from blackHoleShader.ts for
// exactly the reason documented there: the renderer encodes this shader's
// output to sRGB on the way to the screen, so feeding it raw hex components
// lifts every dark area and washes the page out.
const vec3 VOID_COLOR  = vec3(0.00209, 0.00271, 0.00479); // #07090f
const vec3 ICE_CYAN    = vec3(0.00854, 0.38656, 0.55261); // #17a7c4
const vec3 COOL_PURPLE = vec3(0.10470, 0.07829, 0.67205); // #5b4fd6

// Hard caps for the two bounded loops. The uniforms above break out early;
// GLSL needs the loop bound itself to be a compile time constant.
const int MAX_STEPS   = 64;
const int MAX_OCTAVES = 5;

// March extent along the ray, in the same units the core sits in.
const float T_NEAR = 2.15;
const float T_FAR  = 4.60;

// The core sits straight down the ray that lands on the composition anchor,
// so its screen position is decided entirely by the framing offset below.
const float CORE_DIST = 3.30;

// Cloud shape. The gas is densest on a shell around the core rather than at
// it, which is what produces a lit rim with a cleared cavity inside instead
// of a solid glowing ball.
const float RIM_RADIUS = 0.48;
const float RIM_WIDTH  = 0.30;
const float SHADOW_GAIN = 1.05;

// Turbulence.
const float NOISE_SCALE = 7.20;
const float WARP_AMT    = 0.17;
const float DENSITY_FLOOR = 0.52;  // fbm below this contributes nothing
const float DENSITY_GAIN  = 3.10;

// Dust lanes. LANE_DEPTH is how much density a lane removes, LANE_WIDTH how
// tightly the ridged term has to peak before it counts as a lane.
const float LANE_SCALE = 5.20;
const float LANE_WIDTH = 0.42;
const float LANE_DEPTH = 0.98;

// Radiometry.
const float ABSORB     = 2.40;
const float LIGHT_GAIN = 1.20;
const float LIGHT_FALL = 2.90;
const float AMBIENT    = 0.010;
const float CORE_GLOW  = 0.013;  // screen radius of the hot core beacon
const float CORE_GAIN  = 3.90;
const float STAR_GAIN  = 0.70;

// Screen position of the core, as a fraction of the viewport. On a wide
// viewport the resume text column occupies the middle half of the screen, so
// the luminous structure is pushed into the open right margin. On a narrow
// viewport the text runs full bleed from roughly 28 percent of the height
// down, so the anchor moves into the band of empty space above it and the
// whole scene is dimmed, which is what keeps the body copy on near black.
const float FRAME_X   = 0.875;
const float FRAME_Y   = 0.335;
const float FRAME_X_N = 0.760;
const float FRAME_Y_N = 0.170;

float hash11(float n) {
  return fract(sin(n * 78.233) * 43758.5453123);
}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

// Trilinear value noise. One hash per corner, smoothstep interpolation.
float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = p - i;
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));

  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}

// Bounded fbm. The caller passes an octave budget; the loop bound is the
// compile time cap and the budget breaks out of it early.
float fbm(vec3 p, float octaves) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  for (int i = 0; i < MAX_OCTAVES; i++) {
    if (float(i) >= octaves) break;
    sum += amp * vnoise(p);
    norm += amp;
    p = p.yzx * 2.02 + vec3(19.7, 7.3, 11.1);
    amp *= 0.5;
  }
  return sum / max(norm, 0.0001);
}

// Density at a point, together with the lane factor that carved it.
// Returns density in x, and the raw envelope in y so the lighting term can
// tell rim gas from outlying haze.
vec2 sampleCloud(vec3 q, vec3 core, float drift, float octaves) {
  vec3 d = q - core;
  // Slightly flattened and sheared, so the cloud reads as a structure with
  // an orientation rather than as a sphere of fog.
  vec3 s = d * vec3(0.92, 1.28, 0.80);
  s.x += d.y * 0.24;
  float r = length(s);

  // Analytic reject. The warp can move the shell by at most WARP_AMT, so a
  // sample further than that outside the widened shell can never contribute
  // and is discarded before a single noise octave is evaluated. This is the
  // single largest performance lever in the shader: most steps on most
  // pixels never touch the fbm at all.
  float wide = exp(-pow((r - RIM_RADIUS) / (RIM_WIDTH + WARP_AMT), 2.0));
  if (wide < 0.02) return vec2(0.0);

  // Turbulence. Only the z of the sample domain drifts, and very slowly, so
  // the cloud breathes without anything visibly translating.
  vec3 np = q * NOISE_SCALE + vec3(0.0, 0.0, drift);
  float f = fbm(np, octaves);

  // The same field warps the shell radius as well as gating the density.
  // Displacing the envelope is what turns a smooth glowing shell into
  // filaments and cavities: the rim ripples in and out by up to WARP_AMT,
  // so lit gas reaches outward in some directions and pulls back in others.
  float rr = r + (f - 0.5) * WARP_AMT;

  float env = exp(-pow((rr - RIM_RADIUS) / RIM_WIDTH, 2.0));

  // Hard gate on the noise. A smoothstep rather than a subtraction is what
  // makes the difference between wisps with real voids between them and an
  // even blanket at half density everywhere.
  float wisp = smoothstep(DENSITY_FLOOR, DENSITY_FLOOR + 0.20, f);
  float dens = env * wisp * DENSITY_GAIN;

  // Dust lanes. A ridged term on a stretched, lower frequency domain gives
  // elongated filaments rather than blobs, and it is subtracted so it cuts
  // genuinely dark channels through the gas instead of merely dimming it.
  vec3 lp = q * LANE_SCALE * vec3(0.50, 1.30, 0.60);
  // Shear the lane domain so the filaments run on a diagonal. Stretching on
  // y alone produced lanes that read as horizontal scan bands.
  lp.x += q.y * LANE_SCALE * 0.42;
  float ridge = 1.0 - abs(fbm(lp + vec3(41.3, 5.1, 17.9), min(octaves, 3.0)) * 2.0 - 1.0);
  float lane = smoothstep(1.0 - LANE_WIDTH, 1.0, ridge);
  dens *= 1.0 - LANE_DEPTH * lane;

  return vec2(max(dens, 0.0), env);
}

// Sparse background stars, sampled through the ray direction. One hash per
// cell keeps this close to free and it is what sells the volume as sitting
// in front of something rather than floating on flat black.
float starLayer(vec3 dir, float density, float sharpness) {
  vec3 p = dir * density;
  vec3 cell = floor(p);
  vec3 f = p - cell;
  float h = hash13(cell);
  if (h < 0.90) return 0.0;
  vec3 offset = vec3(hash11(h * 13.1), hash11(h * 27.7), hash11(h * 41.3));
  float dd = length(f - offset);
  float star = smoothstep(sharpness, 0.0, dd);
  return star * star * (0.30 + 0.70 * hash11(h * 91.7));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float wide = smoothstep(0.75, 1.35, aspect);
  float frameX = mix(FRAME_X_N, FRAME_X, wide);
  float frameY = mix(FRAME_Y_N, FRAME_Y, wide);
  // Narrow viewports carry the resume text full bleed, so the whole scene is
  // pulled down there. This is the single biggest lever on body copy
  // legibility at 320 pixels.
  float frameGain = mix(0.50, 1.0, wide);

  vec2 center = vec2((frameX - 0.5) * aspect, 0.5 - frameY);
  vec2 p = uv - center;

  float focal = 1.35;
  vec3 ro = vec3(0.0, 0.0, 0.0);
  vec3 rd = normalize(vec3(p.x, p.y, -focal));
  // The core sits exactly on the anchor ray, so p = 0 is the bright point.
  vec3 core = vec3(0.0, 0.0, -CORE_DIST);

  float steps = clamp(uSteps, 12.0, float(MAX_STEPS));
  float octaves = clamp(uOctaves, 1.0, float(MAX_OCTAVES));
  float dt = (T_FAR - T_NEAR) / steps;

  // Per pixel dither on the first step. At these step counts the march would
  // otherwise show concentric banding through the shell.
  float dither = hash13(vec3(gl_FragCoord.xy, 7.0));
  float t = T_NEAR + dt * dither;

  vec3 color = vec3(0.0);
  float trans = 1.0;
  float coreTrans = 1.0;
  bool corePassed = false;

  for (int i = 0; i < MAX_STEPS; i++) {
    if (float(i) >= steps) break;
    if (trans < 0.012) break;

    vec3 pos = ro + rd * t;
    vec2 sampled = sampleCloud(pos, core, uDrift, octaves);
    float dens = sampled.x;

    if (dens > 0.0015) {
      float lightDist = length(pos - core);
      // Illumination from the core. The inverse square falloff plus the
      // shell cavity is what puts a bright rim on the core facing side of
      // the gas and leaves the far side of the cloud in shadow.
      float atten = LIGHT_GAIN / (1.0 + LIGHT_FALL * lightDist * lightDist);

      // Self shadow, taken from the analytic envelope of the sample rather
      // than from a second full cloud lookup. The shell is what casts the
      // shadow: gas sitting deep in the dense band is lit less than gas on
      // its core facing face. A second sampleCloud call here doubled the
      // fbm bill on precisely the steps that were already the expensive ones.
      float shadow = exp(-sampled.y * SHADOW_GAIN);

      // Colour of the scattered light. Hot and near white close in, cooling
      // through ice cyan outward. The purple is the rare use token and only
      // appears in the outermost gas, at a weight that can never read as a
      // second hue.
      float cool = smoothstep(0.06, 0.62, lightDist);
      vec3 tint = mix(vec3(0.86, 0.97, 1.0), ICE_CYAN, cool);
      tint = mix(tint, COOL_PURPLE, 0.22 * smoothstep(0.85, 1.45, lightDist));

      // Aerial perspective: gas further down the ray is cooler and fainter,
      // which is what separates near from far in a fullscreen march.
      float depthNorm = clamp((t - T_NEAR) / (T_FAR - T_NEAR), 0.0, 1.0);
      tint = mix(tint, ICE_CYAN, 0.30 * depthNorm);
      float depthFade = mix(1.0, 0.52, depthNorm);

      vec3 emit = tint * atten * shadow * depthFade + ICE_CYAN * AMBIENT;
      color += trans * dens * dt * emit;
      trans *= exp(-dens * dt * ABSORB);
    }

    // Transmittance at the moment the march reaches the core's own depth.
    // The beacon is emitted through this rather than through the final
    // transmittance, so gas BEHIND the core cannot dim it.
    if (!corePassed && t >= CORE_DIST) {
      coreTrans = trans;
      corePassed = true;
    }

    t += dt;
  }

  // Background stars, occluded by whatever gas is in front of them.
  float s = starLayer(rd, 52.0, 0.15) + starLayer(rd, 104.0, 0.10) * 0.5;
  color += mix(vec3(1.0), ICE_CYAN, 0.40) * s * STAR_GAIN * trans;

  // The hot core itself, seen through the cloud. This is the element that
  // clears the shared Bloom luminance threshold and gives the frame its
  // focal point.
  float rPix = length(p);
  float glow = exp(-pow(rPix / CORE_GLOW, 2.0));
  float bleed = exp(-rPix / (CORE_GLOW * 3.4));
  color += (vec3(0.90, 0.98, 1.0) * glow + mix(vec3(1.0), ICE_CYAN, 0.55) * bleed * 0.28)
           * CORE_GAIN * coreTrans;

  color *= uGain * frameGain;

  // Scroll driven exposure lift, subtle by design and deliberately not
  // positional: the canvas is fixed, so the core stays parked in the margin
  // at every scroll depth.
  color *= 1.0 + 0.12 * uScroll;

  // Filmic roll off. Everything above is unbounded radiance; this maps it
  // into 0 to 1 so the core saturates gracefully instead of clipping.
  color = vec3(1.0) - exp(-color);

  color += VOID_COLOR * (0.9 + 0.1 * sin(uTime * 0.05));

  // Vignette toward the void so page content stays readable at the edges.
  float vig = 1.0 - 0.42 * smoothstep(0.35, 1.15, length(uv));
  color = mix(VOID_COLOR, color, vig);

  gl_FragColor = vec4(color, 1.0);
}
`;
