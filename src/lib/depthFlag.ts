// Feature flag for the depth/3D scene spike. Default state is OFF.
// Reads (in order): the `depth` URL search param, then localStorage.
// `?depth=1` turns it on and persists it. `?depth=0` turns it off and
// clears the persisted value. With no param, falls back to the
// persisted value, defaulting to false.

const STORAGE_KEY = 'depth-spike';

function readParam(): string | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('depth');
  } catch {
    return null;
  }
}

function readStorage(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStorage(value: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures (privacy mode, quota, etc).
  }
}

export function isDepthEnabled(): boolean {
  try {
    const param = readParam();
    if (param === '1') {
      writeStorage(true);
      return true;
    }
    if (param === '0') {
      writeStorage(false);
      return false;
    }
    return readStorage();
  } catch {
    return false;
  }
}
