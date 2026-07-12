import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { signSession, verifySession } from './session'

const DAY = 86_400_000

describe('session token', () => {
  it('round-trips an admin token', () => {
    expect(verifySession(signSession('s3cret', 'admin'), 's3cret')).toBe('admin')
  })
  it('round-trips a viewer token', () => {
    expect(verifySession(signSession('s3cret', 'viewer'), 's3cret')).toBe('viewer')
  })
  it('rejects a tampered token', () => {
    expect(verifySession(signSession('s3cret', 'admin') + 'x', 's3cret')).toBe(null)
  })
  it('rejects a viewer token edited to claim admin', () => {
    const t = signSession('s3cret', 'viewer')
    const forged = t.replace('.viewer.', '.admin.')
    expect(forged).not.toBe(t)
    expect(verifySession(forged, 's3cret')).toBe(null)
  })
  it('rejects an equal-length forged signature', () => {
    const t = signSession('s3cret', 'admin')
    const i = t.lastIndexOf('.') + 20
    const c = t[i] === '0' ? '1' : '0'
    const forged = t.slice(0, i) + c + t.slice(i + 1)
    expect(forged.length).toBe(t.length)
    expect(verifySession(forged, 's3cret')).toBe(null)
  })
  it('rejects the wrong secret', () => {
    expect(verifySession(signSession('a', 'admin'), 'b')).toBe(null)
  })
  it('rejects an expired token', () => {
    const old = signSession('s', 'admin', Date.now() - 8 * DAY)
    expect(verifySession(old, 's')).toBe(null)
  })
  it('rejects an unknown role even when correctly signed', () => {
    const exp = Date.now() + DAY
    const payload = `${exp}.root`
    const sig = createHmac('sha256', 's').update(payload).digest('hex')
    expect(verifySession(`${payload}.${sig}`, 's')).toBe(null)
  })
  it('rejects legacy two-part exp.sig tokens', () => {
    const exp = Date.now() + DAY
    const sig = createHmac('sha256', 's').update(String(exp)).digest('hex')
    expect(verifySession(`${exp}.${sig}`, 's')).toBe(null)
  })
  it('rejects garbage and undefined', () => {
    expect(verifySession(undefined, 's')).toBe(null)
    expect(verifySession('nope', 's')).toBe(null)
    expect(verifySession('123.', 's')).toBe(null)
    expect(verifySession('123.admin.', 's')).toBe(null)
  })
})
