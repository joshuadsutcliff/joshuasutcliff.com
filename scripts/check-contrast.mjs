// Computes WCAG 2.1 relative-luminance contrast ratios of the CLI foreground
// tokens against --cli-bg, and fails the build if any drop below 4.5:1.
//
// Hex values are parsed directly out of src/index.css rather than
// hardcoded here, so this check cannot silently drift from the tokens it
// claims to verify.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cssPath = path.join(__dirname, '..', 'src', 'index.css')
const css = readFileSync(cssPath, 'utf8')

const BG_TOKEN = '--cli-bg'
const FG_TOKENS = ['--cli-text', '--cli-cyan', '--cli-sakura', '--cli-green', '--cli-emphasis', '--cli-warn']
const MIN_RATIO = 4.5

function readToken(name) {
  const match = css.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))
  if (!match) {
    throw new Error(`Token ${name} not found in src/index.css`)
  }
  return match[1]
}

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

const bgHex = readToken(BG_TOKEN)

let anyFail = false
console.log(`Background: ${BG_TOKEN} = ${bgHex}\n`)

for (const token of FG_TOKENS) {
  const hex = readToken(token)
  const ratio = contrastRatio(hex, bgHex)
  const pass = ratio >= MIN_RATIO
  if (!pass) anyFail = true
  const marker = pass ? 'PASS' : 'FAIL'
  console.log(`${token.padEnd(16)} ${hex.padEnd(9)} vs ${bgHex}  ratio=${ratio.toFixed(2)}:1  ${marker}`)
}

if (anyFail) {
  console.error('\nOne or more CLI tokens fail the 4.5:1 minimum contrast ratio against --cli-bg.')
  process.exit(1)
} else {
  console.log('\nAll CLI tokens meet the 4.5:1 minimum contrast ratio against --cli-bg.')
}
