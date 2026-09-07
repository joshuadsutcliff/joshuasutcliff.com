// Shaders for the /work orbital system.
//
// Palette. These are the LINEAR values of the design tokens, not their sRGB
// hex components. The renderer re-encodes this shader's output to sRGB on the
// way to the screen, so feeding it raw hex components is how a scene blows
// out. Copied verbatim from starfieldShader.ts so all four scenes agree.
//   ice cyan    #17a7c4 -> vec3(0.00854, 0.38656, 0.55261)
//   cool purple #5b4fd6 -> vec3(0.10470, 0.07829, 0.67205)

/**
 * Orbit trail ribbon.
 *
 * The ribbon is built on the CPU as a triangle strip: two vertices per arc
 * sample, offset perpendicular to the screen-projected tangent. `aFade` runs
 * 0 at the tail to 1 at the head, so a single attribute drives both the alpha
 * decay and the colour ramp along the trail's length.
 */
export const trailVertexShader = /* glsl */ `
  attribute float aFade;
  varying float vFade;

  void main() {
    vFade = aFade;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const trailFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  uniform float uAmp;

  varying float vFade;

  void main() {
    // Squared falloff on top of the linear attribute: a linear decay reads as
    // a hard-edged streak, the square reads as something dissipating.
    float f = vFade * vFade;
    // The head gets a whisper of extra white so the trail visibly attaches to
    // the body rather than stopping short of it.
    vec3 col = uColor + vec3(0.20, 0.24, 0.26) * pow(vFade, 8.0);
    // Additive blending, so alpha is carried in the colour itself. Peak stays
    // under the shared Bloom luminance threshold of 0.65 on purpose: only the
    // core is meant to bloom.
    gl_FragColor = vec4(col * f * uAmp, 1.0);
  }
`;

/**
 * The luminous core at the system's centre of mass.
 *
 * Deliberately clears the shared Bloom threshold. A view-space normal drives
 * a limb ramp so the sphere reads as a glowing body with an edge rather than
 * as a flat disc, which is what a constant colour would give.
 */
export const coreVertexShader = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const coreFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vNormalView;
  varying vec3 vViewDir;

  const vec3 ICE_CYAN = vec3(0.00854, 0.38656, 0.55261);

  void main() {
    float facing = clamp(dot(normalize(vNormalView), normalize(vViewDir)), 0.0, 1.0);
    // Hot, near-white centre falling to saturated cyan at the limb.
    vec3 hot = vec3(0.72, 0.95, 1.00);
    vec3 col = mix(ICE_CYAN * 2.10, hot * 1.65, pow(facing, 1.7));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * Core halo. A camera-facing quad with a smooth radial falloff, sitting in
 * front of the core sphere in draw order but writing no depth, so it never
 * contaminates the depth buffer the depth-of-field pass reads.
 */
export const haloVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const haloFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uAmp;

  varying vec2 vUv;

  const vec3 ICE_CYAN = vec3(0.00854, 0.38656, 0.55261);
  const vec3 COOL_PURPLE = vec3(0.10470, 0.07829, 0.67205);

  void main() {
    float d = length(vUv - 0.5) * 2.0;
    if (d > 1.0) discard;
    // Two nested falloffs: a tight bright inner glow and a wide faint bleed.
    float inner = exp(-d * d * 26.0);
    float outer = exp(-d * d * 7.0);
    // Window forcing the whole halo to exactly zero at the quad's inscribed
    // circle. Without it the wide falloff is still finite at d = 1 and the
    // quad's edge shows up as a hard circular rim.
    float window = pow(max(0.0, 1.0 - d * d), 2.0);
    vec3 col = ICE_CYAN * (inner * 1.30 + outer * 0.30);
    // The purple is the rare-use whisper: only at the outer edge, only faint.
    col += COOL_PURPLE * outer * 0.07;
    gl_FragColor = vec4(col * window * uAmp, 1.0);
  }
`;
