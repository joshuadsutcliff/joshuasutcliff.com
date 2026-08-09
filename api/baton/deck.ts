import type { VercelRequest, VercelResponse } from '@vercel/node'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyBatonSession } from '../_lib/baton-session.js'

function deckPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', '_lib', 'baton-deck.html')
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }
  const secret = process.env.ADMIN_SECRET
  if (!secret) return res.status(500).json({ error: 'server not configured' })
  if (!verifyBatonSession(req.cookies?.baton_session, secret)) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const html = readFileSync(deckPath(), 'utf8')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).send(html)
}
