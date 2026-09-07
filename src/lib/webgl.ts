// WebGL2 capability probe. Caches its result at module scope since
// browsers cap the number of live WebGL contexts (roughly 8 to 16),
// and explicitly releases the probe context so it does not count
// against that cap after the check is done.
//
// The same probe also harvests the GPU renderer string before the
// context is released, so device tiering can read it without ever
// creating a second WebGL context.

let cachedResult: boolean | null = null;
let cachedRenderer: string | null = null;

function readRenderer(gl: WebGL2RenderingContext): string | null {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const unmasked = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      if (typeof unmasked === 'string' && unmasked.length > 0) return unmasked;
    }
    // Some browsers removed the debug extension and fold the useful
    // value into RENDERER instead. Absence of both is not a failure.
    const plain = gl.getParameter(gl.RENDERER);
    if (typeof plain === 'string' && plain.length > 0) return plain;
    return null;
  } catch {
    return null;
  }
}

export function hasWebGL2(): boolean {
  if (cachedResult !== null) return cachedResult;

  try {
    if (typeof document === 'undefined') {
      cachedResult = false;
      return cachedResult;
    }
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    if (!gl) {
      cachedResult = false;
      return cachedResult;
    }
    cachedResult = true;
    cachedRenderer = readRenderer(gl);
    const loseContextExt = gl.getExtension('WEBGL_lose_context');
    if (loseContextExt) {
      loseContextExt.loseContext();
    }
  } catch {
    cachedResult = false;
  }

  return cachedResult ?? false;
}

// The GPU renderer string harvested by the probe above, or null when it
// is unavailable (no WebGL2, extension blocked, privacy hardening).
// Null means "unknown", never "bad".
export function getProbedRenderer(): string | null {
  // Force the probe if it has not run yet, so callers do not depend on
  // hasWebGL2() having been invoked first. The probe is cached and the
  // context is released, so this stays cheap and leak-free.
  if (cachedResult === null) hasWebGL2();
  return cachedRenderer;
}
