// WebGL2 capability probe. Caches its result at module scope since
// browsers cap the number of live WebGL contexts (roughly 8 to 16),
// and explicitly releases the probe context so it does not count
// against that cap after the check is done.

let cachedResult: boolean | null = null;

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
    const loseContextExt = gl.getExtension('WEBGL_lose_context');
    if (loseContextExt) {
      loseContextExt.loseContext();
    }
  } catch {
    cachedResult = false;
  }

  return cachedResult ?? false;
}
