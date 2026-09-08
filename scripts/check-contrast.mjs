// Computes WCAG 2.1 relative-luminance contrast ratios of the CLI foreground
// tokens against --cli-bg, for every theme block defined in src/index.css,
// and fails the build if any theme/token pair drops below 4.5:1.
//
// Hex values are parsed directly out of src/index.css rather than
// hardcoded here, so this check cannot silently drift from the tokens it
// claims to verify. It discovers theme blocks (the bare :root block, plus
// every :root[data-theme="..."] block) rather than assuming a fixed list,
// so a new theme added to the stylesheet is automatically checked.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cssPath = path.join(__dirname, '..', 'src', 'index.css')
const css = readFileSync(cssPath, 'utf8')

const BG_TOKEN = '--cli-bg'
const FG_TOKENS = ['--cli-text', '--cli-cyan', '--cli-sakura', '--cli-green', '--cli-emphasis', '--cli-warn', '--cli-dim', '--cli-bad']
const RGB_COMPANIONS = ['--cli-cyan-rgb', '--cli-sakura-rgb', '--cli-green-rgb', '--cli-warn-rgb', '--cli-dim-rgb', '--cli-bad-rgb']
const MIN_RATIO = 4.5

function hexToRgb(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return { r, g, b }
}

function channelLuminance(c) {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function relativeLuminance({ r, g, b }) {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexToRgb(hexA))
  const lumB = relativeLuminance(hexToRgb(hexB))
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

// A theme block is either the bare `:root { ... }` block (matched when the
// legacy default block itself defines --cli-bg, which it does not, so the
// real Default theme block is the explicit :root[data-theme="default"]
// alias below it) or a `:root[data-theme="id"] { ... }` block. CSS custom
// property blocks here contain no nested braces, so a simple
// "up to the next top-level closing brace" scan is sufficient; we still
// walk brace depth defensively in case a future block gains a nested rule.
// Strips CSS comments before scanning, so a comment that happens to
// mention a token (e.g. "/* was --cli-bg: #000 */") inside an unrelated
// block cannot make this treat that block as a theme block, or make
// readToken / readRgbToken below pick up a commented-out value.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '')
}

function findThemeBlocks(source) {
  source = stripComments(source)
  const blocks = []
  const headerRe = /:root(\[data-theme=['"]([a-z0-9-]+)['"]\])?\s*\{/g
  let match
  while ((match = headerRe.exec(source))) {
    const id = match[2] ?? 'default (bare :root)'
    const bodyStart = match.index + match[0].length
    let depth = 1
    let i = bodyStart
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++
      else if (source[i] === '}') depth--
      i++
    }
    const body = source.slice(bodyStart, i - 1)
    // Only treat this as a theme block if it defines the CLI bg
    // token; the legacy bare :root block earlier in the file (--bg, --fg,
    // etc.) matches the header shape but is a different, unrelated token
    // group and is out of scope here.
    if (new RegExp(`${BG_TOKEN}\\s*:`).test(body)) {
      blocks.push({ id, body })
    }
  }
  return blocks
}

function readToken(body, name) {
  const match = body.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))
  return match ? match[1] : null
}

function readRgbToken(body, name) {
  const match = body.match(new RegExp(`${name}\\s*:\\s*([0-9]{1,3})\\s*,\\s*([0-9]{1,3})\\s*,\\s*([0-9]{1,3})\\s*;`))
  return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) } : null
}

const themeBlocks = findThemeBlocks(css)

if (themeBlocks.length === 0) {
  throw new Error('No theme blocks (:root with --cli-bg) found in src/index.css')
}

let anyFail = false

for (const { id, body } of themeBlocks) {
  const bgHex = readToken(body, BG_TOKEN)
  if (!bgHex) {
    console.error(`[${id}] Missing ${BG_TOKEN}; cannot check this theme.`)
    anyFail = true
    continue
  }

  console.log(`\n=== Theme: ${id} ===`)
  console.log(`Background: ${BG_TOKEN} = ${bgHex}\n`)

  for (const token of FG_TOKENS) {
    const hex = readToken(body, token)
    if (!hex) {
      console.error(`${token.padEnd(16)} MISSING in theme "${id}" (incomplete theme block)`)
      anyFail = true
      continue
    }
    const ratio = contrastRatio(hex, bgHex)
    const pass = ratio >= MIN_RATIO
    if (!pass) anyFail = true
    const marker = pass ? 'PASS' : 'FAIL'
    console.log(`${token.padEnd(16)} ${hex.padEnd(9)} vs ${bgHex}  ratio=${ratio.toFixed(2)}:1  ${marker}`)
  }

  console.log()
  for (const rgbName of RGB_COMPANIONS) {
    const hexName = rgbName.replace('-rgb', '')
    const hex = readToken(body, hexName)
    const actual = readRgbToken(body, rgbName)
    if (!hex || !actual) {
      console.error(`${rgbName.padEnd(16)} MISSING in theme "${id}" (incomplete theme block)`)
      anyFail = true
      continue
    }
    const expected = hexToRgb(hex)
    const pass = expected.r === actual.r && expected.g === actual.g && expected.b === actual.b
    if (!pass) anyFail = true
    const marker = pass ? 'PASS' : 'FAIL'
    console.log(
      `${rgbName.padEnd(16)} ${`${actual.r}, ${actual.g}, ${actual.b}`.padEnd(14)} vs ${hexName}=${hex} (${expected.r}, ${expected.g}, ${expected.b})  ${marker}`,
    )
  }
}

console.log()
if (anyFail) {
  console.error('One or more themes fail the 4.5:1 minimum contrast ratio against their own --cli-bg, have a drifted -rgb token, or are missing a required token.')
  process.exit(1)
} else {
  console.log(`All ${themeBlocks.length} theme(s) meet the 4.5:1 minimum contrast ratio against their own --cli-bg, and all -rgb tokens match their hex counterparts.`)
}
