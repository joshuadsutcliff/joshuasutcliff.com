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
const FG_TOKENS = ['--cli-text', '--cli-cyan', '--cli-sakura', '--cli-green', '--cli-emphasis', '--cli-warn', '--cli-dim', '--cli-bad']
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

// Generic rgb-companion check: any token named "--<name>-rgb" is a
// hand-written "r, g, b" triple meant to mirror the hex value of its
// "--<name>" counterpart (used for rgba() alpha compositing in CSS, which
// cannot consume a hex token directly). Nothing in CSS enforces that the two
// stay in sync, so verify it here for every such pair found in the file.
console.log()

function findRgbCompanions(source) {
  const names = new Set()
  const re = /--([a-z0-9-]+)-rgb\s*:/g
  let match
  while ((match = re.exec(source))) {
    names.add(match[1])
  }
  return [...names]
}

function readRgbToken(name) {
  const match = css.match(new RegExp(`--${name}-rgb\\s*:\\s*([0-9]{1,3})\\s*,\\s*([0-9]{1,3})\\s*,\\s*([0-9]{1,3})\\s*;`))
  if (!match) {
    throw new Error(`Token --${name}-rgb not found in src/index.css`)
  }
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) }
}

const rgbCompanionNames = findRgbCompanions(css)

for (const name of rgbCompanionNames) {
  const hexTokenName = `--${name}`
  let hex
  try {
    hex = readToken(hexTokenName)
  } catch {
    // No hex counterpart to compare against; not this check's concern.
    continue
  }
  const expected = hexToRgb(hex)
  const actual = readRgbToken(name)
  const pass = expected.r === actual.r && expected.g === actual.g && expected.b === actual.b
  if (!pass) anyFail = true
  const marker = pass ? 'PASS' : 'FAIL'
  console.log(
    `${(`--${name}-rgb`).padEnd(16)} ${`${actual.r}, ${actual.g}, ${actual.b}`.padEnd(14)} vs ${hexTokenName}=${hex} (${expected.r}, ${expected.g}, ${expected.b})  ${marker}`,
  )
}

if (anyFail) {
  console.error('\nOne or more CLI tokens fail the 4.5:1 minimum contrast ratio against --cli-bg, or an -rgb token has drifted from its hex counterpart.')
  process.exit(1)
} else {
  console.log('\nAll CLI tokens meet the 4.5:1 minimum contrast ratio against --cli-bg, and all -rgb tokens match their hex counterparts.')
}
