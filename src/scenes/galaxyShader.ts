// GLSL for the /projects spiral galaxy scene.
//
// Unlike the /about black hole, which is a single fullscreen ray marched
// quad, this scene is real geometry: one BufferGeometry of points sitting
// at real depths. Positions are generated once on the CPU and the vertex
// shader only rotates and projects them, so nothing is rebuilt per frame.
//
// Attribute layout, all generated once at mount:
//   position  -> vec3(radius, height, angle0) in disc polar space, NOT xyz.
//                Packing polar coordinates into the position attribute lets
//                the vertex shader apply differential rotation for free.
//   aProps    -> vec4(brightness, tint, size, seed)
//                brightness already carries the dust lane darkening and the
//                density variation, both computed on the CPU.

export const galaxyVertexShader = /* glsl */ `
precision highp float;

attribute vec4 aProps;

uniform float uTime;
uniform float uScroll;
uniform float uPixelRatio;
uniform float uSizeScale;
uniform float uFocalDepth;
uniform float uCocScale;

varying float vBright;
varying float vTint;
varying float vCoc;
varying float vRadius;

void main() {
  float radius = position.x;
  float height = position.y;
  float angle0 = position.z;

  // Differential rotation: inner material sweeps faster than outer
  // material, the way a real disc does. The exponent is deliberately
  // gentle so the arms do not wind themselves into mush over a long
  // session on the page.
  float omega = 1.0 / (0.34 + pow(radius, 1.25) * 2.7);
  float angle = angle0 + uTime * 0.030 * omega;

  // Scroll drives a very small radial breathing, so the composition
  // evolves as the visitor moves down the page without ever lurching.
  float breathe = 1.0 + 0.045 * uScroll;

  vec3 discPos = vec3(
    cos(angle) * radius * breathe,
    height * breathe,
    sin(angle) * radius * breathe
  );

  vec4 mvPosition = modelViewMatrix * vec4(discPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float viewDepth = -mvPosition.z;

  // Circle of confusion, computed here rather than in a post pass. The
  // points are additively blended with depth writes off, so the depth
  // buffer is uniform and a real depth of field pass has nothing to read.
  // Widening the sprite and dropping its peak radiance with distance from
  // the focal plane produces the same read for no extra cost.
  float coc = clamp(abs(viewDepth - uFocalDepth) * uCocScale, 0.0, 1.0);
  vCoc = coc;

  float size = aProps.z * (1.0 + coc * 0.9);
  gl_PointSize = size * uPixelRatio * uSizeScale / max(viewDepth, 0.15);
  gl_PointSize = clamp(gl_PointSize, 1.0, 14.0);

  // Energy is conserved as the sprite spreads: a defocused point gets
  // bigger and correspondingly fainter.
  vBright = aProps.x / (1.0 + coc * 1.5);
  vTint = aProps.y;
  vRadius = radius;
}
`;

export const galaxyFragmentShader = /* glsl */ `
precision highp float;

varying float vBright;
varying float vTint;
varying float vCoc;
varying float vRadius;

uniform float uScroll;
uniform float uExposure;

// Palette. These are the LINEAR values of the design tokens, not their
// sRGB hex components, and they are copied verbatim from the black hole
// shader for exactly the reason documented there: the renderer encodes
// this shader's output to sRGB on the way to the screen, so feeding it
// the raw hex components lifts every dark area and washes the page out.
const vec3 ICE_CYAN    = vec3(0.00854, 0.38656, 0.55261); // #17a7c4
const vec3 COOL_PURPLE = vec3(0.10470, 0.07829, 0.67205); // #5b4fd6

void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;

  // Gaussian sprite. A focused point keeps a tight bright kernel, a
  // defocused one flattens toward an even disc, which is what a real
  // circle of confusion looks like.
  float sharp = mix(9.0, 3.2, vCoc);
  float falloff = exp(-r2 * sharp * 4.0);

  // Radial colour ramp. Near white through the bulge, ice cyan across the
  // body of the arms, and only at the very outer edge a faint purple. The
  // purple is the rare-use token and is kept weak enough that it never
  // reads as a second hue competing with the cyan.
  float t = clamp(vRadius / 1.0, 0.0, 1.0);
  vec3 hot = mix(vec3(1.0, 0.99, 0.97), vec3(0.62, 0.92, 1.0), smoothstep(0.02, 0.20, t));
  vec3 body = mix(hot, ICE_CYAN, smoothstep(0.16, 0.66, t));
  vec3 col = mix(body, COOL_PURPLE, 0.30 * vTint * smoothstep(0.58, 1.0, t));

  float intensity = vBright * falloff * uExposure * (1.0 + 0.10 * uScroll);

  gl_FragColor = vec4(col * intensity, 1.0);
}
`;
