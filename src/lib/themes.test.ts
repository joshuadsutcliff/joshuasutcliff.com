/// <reference types="node" />
// tsconfig.app.json's "types" list is scoped to ["vite/client"], so a bare
// node:fs import fails type resolution there; @types/node is already an
// installed dependency (used by vite/vitest themselves), so a local
// reference directive is enough to pull in its ambient types for just this
// file without widening the app project's types for every other module.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { THEMES } from './themes'

// Pins the hand-synced hexes in THEMES (bg/primary/secondary) to the
// --cli-bg / --cli-cyan / --cli-sakura values actually shipped in
// src/index.css, so the two can no longer silently drift apart the way
// themes.ts's own header comment warns they might.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cssPath = path.join(__dirname, '..', 'index.css')
const css = readFileSync(cssPath, 'utf8')

function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '')
}

function findBlockBody(source: string, headerRe: RegExp) {
  const match = headerRe.exec(source)
  if (!match) return null
  const bodyStart = match.index + match[0].length
  let depth = 1
  let i = bodyStart
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') depth--
    i++
  }
  return source.slice(bodyStart, i - 1)
}

function readToken(body: string, name: string) {
  const match = body.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))
  return match ? match[1] : null
}

function themeBlockBody(source: string, id: string) {
  const headerRe = new RegExp(`:root\\[data-theme=['"]${id}['"]\\]\\s*\\{`)
  return findBlockBody(source, headerRe)
}

describe('THEMES registry matches src/index.css', () => {
  const stripped = stripComments(css)

  for (const theme of THEMES) {
    it(`${theme.id}: bg/primary/secondary match --cli-bg/--cli-cyan/--cli-sakura`, () => {
      const body = themeBlockBody(stripped, theme.id)
      expect(body, `no :root[data-theme="${theme.id}"] block found in index.css`).not.toBeNull()

      const bg = readToken(body!, '--cli-bg')
      const primary = readToken(body!, '--cli-cyan')
      const secondary = readToken(body!, '--cli-sakura')

      expect(bg?.toLowerCase()).toBe(theme.bg.toLowerCase())
      expect(primary?.toLowerCase()).toBe(theme.primary.toLowerCase())
      expect(secondary?.toLowerCase()).toBe(theme.secondary.toLowerCase())
    })
  }

  it('default alias block matches the bare :root block for every CLI token', () => {
    const bareBody = findBlockBody(stripped, /:root\s*\{/)
    const aliasBody = themeBlockBody(stripped, 'default')
    expect(bareBody).not.toBeNull()
    expect(aliasBody).not.toBeNull()

    const tokens = [
      '--cli-bg',
      '--cli-text',
      '--cli-cyan',
      '--cli-sakura',
      '--cli-green',
      '--cli-emphasis',
      '--cli-warn',
      '--cli-dim',
      '--cli-bad',
    ]

    for (const token of tokens) {
      const bareValue = readToken(bareBody!, token)
      const aliasValue = readToken(aliasBody!, token)
      expect(bareValue, `${token} missing from bare :root block`).not.toBeNull()
      expect(aliasValue?.toLowerCase(), `${token} diverges between :root and :root[data-theme="default"]`).toBe(
        bareValue!.toLowerCase(),
      )
    }
  })
})
