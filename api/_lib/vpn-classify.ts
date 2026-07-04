// Heuristic hosting/VPN-class network classifier. Maintainable: extend either list.
export const VPN_ASNS = new Set<number>([
  9009, // M247 (Nord/Surfshark/many)
  212238, // Datacamp / CDN77
  60068, // Datacamp
  16247, // M247 alt
  136787, // TEFINCOM (NordVPN)
  205119, // Tzulo/VPN infra
  40676, // Psychz
  46562, // Performive/Total Server
  199524, // G-Core
  20473, // Vultr/Choopa
])

export const HOSTING_KEYWORDS =
  /hosting|host(?:ed)?[ -]?(?:service|solution)|datacenter|data[ -]center|colo(?:cation)?|\bvpn\b|proxy|server|cloud|amazon|aws|google[ -]?cloud|gcp|microsoft|azure|digitalocean|linode|akamai|ovh|hetzner|vultr|leaseweb|contabo|choopa|m247|datacamp|packet|scaleway|oracle/i

export function classifyAsn(asn: number, org: string): boolean {
  if (VPN_ASNS.has(asn)) return true
  if (!org) return false
  return HOSTING_KEYWORDS.test(org)
}
