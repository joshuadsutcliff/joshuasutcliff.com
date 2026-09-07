// Stable per-browser-session hex id for the CLI header strip. Generated once
// per browser session (persisted in sessionStorage so it survives route
// changes within a visit, but resets on a new tab/session). Every storage
// read and write is guarded so a locked-down or quota-exhausted storage can
// never throw into the render path, following the same defensive pattern as
// src/lib/cliFlag.ts.

const STORAGE_KEY = 'cli-session-id'

function readStorage(): string | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    return window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStorage(value: string): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    window.sessionStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Ignore storage failures (privacy mode, quota, etc).
  }
}

function generateHex(): string {
  try {
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(4)
      window.crypto.getRandomValues(bytes)
      return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  } catch {
    // Fall through to Math.random fallback.
  }
  return Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0')
}

export function getSessionId(): string {
  try {
    const stored = readStorage()
    if (stored) return stored
    const generated = generateHex()
    writeStorage(generated)
    return generated
  } catch {
    return generateHex()
  }
}
