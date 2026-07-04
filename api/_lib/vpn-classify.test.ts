import { describe, it, expect } from 'vitest'
import { classifyAsn } from './vpn-classify'

describe('classifyAsn', () => {
  it('flags a known VPN ASN regardless of org string', () => {
    expect(classifyAsn(9009, 'M247 Europe SRL')).toBe(true)
  })
  it('flags hosting keywords', () => {
    expect(classifyAsn(14061, 'DIGITALOCEAN-ASN')).toBe(true)
    expect(classifyAsn(16509, 'AMAZON-02')).toBe(true)
    expect(classifyAsn(212238, 'Datacamp Limited')).toBe(true)
  })
  it('does not flag residential ISPs', () => {
    expect(classifyAsn(7922, 'COMCAST-7922')).toBe(false)
    expect(classifyAsn(22773, 'ASN-CXA-ALL-CCI-22773-RDC')).toBe(false)
  })
  it('handles empty org', () => {
    expect(classifyAsn(0, '')).toBe(false)
  })
})
