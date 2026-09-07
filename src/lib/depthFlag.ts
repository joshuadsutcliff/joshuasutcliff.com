// Feature flag for the depth/3D scene spike. Default state is ON.
// Reads (in order): the `depth` URL search param, then localStorage.
// `?depth=1` turns it on and persists it. `?depth=0` turns it off and
// persists that choice. With no param, falls back to the persisted
// value, defaulting to true when nothing is stored.
//
// Storage is tri-state on purpose. Now that the default is on, an
// absent key has to mean "no choice made, use the default", so an
// explicit opt-out must be written as '0' rather than by removing the
// key. '1' means on, '0' means off, absent means default.

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

function readStorage(): boolean | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
    return null;
  } catch {
    return null;
  }
}

function writeStorage(value: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
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
    const stored = readStorage();
    if (stored !== null) return stored;
    return true;
  } catch {
    return true;
  }
}

// True only when `?depth=1` is present in the URL for this page load.
// This is the explicit force-on escape hatch: it is distinct from the
// flag merely being enabled, and callers use it to bypass the device
// capability gate so the scenes can be tested on any hardware.
export function isDepthForced(): boolean {
  try {
    return readParam() === '1';
  } catch {
    return false;
  }
}
