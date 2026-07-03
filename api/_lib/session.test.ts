import { describe, it, expect } from 'vitest'
import { signSession, verifySession } from './session'

const DAY = 86_400_000

describe('session token', () => {
  it('round-trips a valid token', () => {
    expect(verifySession(signSession('s3cret'), 's3cret')).toBe(true)
  })
  it('rejects a tampered token', () => {
    expect(verifySession(signSession('s3cret') + 'x', 's3cret')).toBe(false)
  })
  it('rejects the wrong secret', () => {
    expect(verifySession(signSession('a'), 'b')).toBe(false)
  })
  it('rejects an expired token', () => {
    const old = signSession('s', Date.now() - 8 * DAY)
    expect(verifySession(old, 's')).toBe(false)
  })
  it('rejects garbage and undefined', () => {
    expect(verifySession(undefined, 's')).toBe(false)
    expect(verifySession('nope', 's')).toBe(false)
    expect(verifySession('123.', 's')).toBe(false)
  })
})
