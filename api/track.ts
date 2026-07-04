import type { VercelRequest, VercelResponse } from '@vercel/node'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { classifyAsn } from './_lib/vpn-classify.js'

type AsnReader = { get: (ip: string) => { autonomous_system_number?: number; autonomous_system_organization?: string } | null }
let readerPromise: Promise<AsnReader | null> | null = null

function dbPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '_lib', 'GeoLite2-ASN.mmdb')
}

async function getReader(): Promise<AsnReader | null> {
  readerPromise ??= (async () => {
    try {
      const p = dbPath()
      if (!existsSync(p)) return null
      const { open } = await import('maxmind')
      return (await open(p)) as unknown as AsnReader
    } catch (err) {
      console.error('track: asn db load failed:', err instanceof Error ? err.message : String(err))
      return null
    }
  })()
  return readerPromise
}

function clientIp(req: VercelRequest): string {
  const real = req.headers['x-real-ip']
  if (typeof real === 'string' && real) return real
  const fwd = req.headers['x-forwarded-for']
  const first = (Array.isArray(fwd) ? fwd[0] : fwd ?? '').split(',')[0].trim()
  return first
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  const base = process.env.UMAMI_API_URL
  if (!base) return res.status(502).json({ error: 'not configured' })

  let body: Record<string, unknown> | null = null
  try {
    body = typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : null
  } catch {
    body = null
  }
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : ''
  const ip = clientIp(req)

  const fwdHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  if (ua) fwdHeaders['User-Agent'] = ua
  if (ip) fwdHeaders['x-vercel-forwarded-for'] = ip

  let upstreamStatus = 502
  let upstreamBody = ''
  try {
    const r = await fetch(`${base}/api/send`, {
      method: 'POST',
      headers: fwdHeaders,
      body: JSON.stringify(body ?? {}),
    })
    upstreamStatus = r.status
    upstreamBody = await r.text()
  } catch (err) {
    console.error('track: umami forward failed:', err instanceof Error ? err.message : String(err))
    return res.status(502).send('upstream unavailable')
  }

  // Best-effort VPN classification + companion event. Never affects the response.
  try {
    const payload = body?.payload as Record<string, unknown> | undefined
    const isPageview = body?.type === 'event' && payload && typeof payload.website === 'string' && !payload.name
    if (isPageview && ip) {
      const reader = await getReader()
      const rec = reader?.get(ip)
      if (rec && classifyAsn(rec.autonomous_system_number ?? 0, rec.autonomous_system_organization ?? '')) {
        await fetch(`${base}/api/send`, {
          method: 'POST',
          headers: fwdHeaders,
          body: JSON.stringify({
            type: 'event',
            payload: {
              website: payload.website,
              url: payload.url,
              hostname: payload.hostname,
              language: payload.language,
              screen: payload.screen,
              name: 'vpn-visit',
              data: {
                asn: rec.autonomous_system_number ?? 0,
                org: rec.autonomous_system_organization ?? '',
              },
            },
          }),
        }).catch(() => {})
      }
    }
  } catch (err) {
    console.error('track: classify failed:', err instanceof Error ? err.message : String(err))
  }

  res.status(upstreamStatus).send(upstreamBody)
}
