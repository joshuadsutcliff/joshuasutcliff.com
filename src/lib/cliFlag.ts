// Feature flag for the CLI header/footer chrome. Default state is OFF.
// Reads (in order): the `cli` URL search param, then localStorage.
// `?cli=1` turns it on and persists it. `?cli=0` turns it off and
// persists that choice. With no param, falls back to the persisted
// value, defaulting to false when nothing is stored.
//
// Storage is tri-state on purpose: '1' means on, '0' means off, and an
// absent key means "no choice made, use the default". Every read and
// write is guarded so a locked-down or quota-exhausted storage cannot
// throw into the render path.

const STORAGE_KEY = 'cli-frame';

function readParam(): string | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('cli');
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

export function isCliFrameEnabled(): boolean {
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
