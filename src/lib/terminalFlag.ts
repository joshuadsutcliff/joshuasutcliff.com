// Feature flag for the About page CLI terminal chrome. Default state is OFF.
// Reads (in order): the `terminal` URL search param, then localStorage.
// `?terminal=1` turns it on and persists it. `?terminal=0` turns it off and
// clears the persisted choice. With no param, falls back to the persisted
// value, defaulting to false when nothing is stored.
//
// Storage is tri-state on purpose, mirroring depthFlag: '1' means on,
// '0' means off, absent means "no choice made, use the default".
// This module is deliberately separate from depthFlag and shares no
// param or key with it.

const STORAGE_KEY = 'about-terminal';

function readParam(): string | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('terminal');
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
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures (privacy mode, quota, etc).
  }
}

export function isAboutTerminalEnabled(): boolean {
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
    return false;
  } catch {
    return false;
  }
}
