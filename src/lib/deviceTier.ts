// Device capability tier for the react-three-fiber background scenes.
//
// This runs during render on every page load, so it is synchronous,
// cheap, and cached at module scope. It does no benchmarking and no
// frame timing: it only reads capability hints the browser already has.
//
// Governing bias: FALSE NEGATIVES OVER FALSE POSITIVES is explicitly
// inverted here in favour of inclusion, because the failure modes are
// asymmetric in a specific way. Excluding a capable phone costs a nice
// background. Including a weak phone ships a janky hero, which is the
// outcome the project brief calls unacceptable. So the rule is:
//
//   Fail only on POSITIVE EVIDENCE of weakness. Never fail on the
//   ABSENCE of a signal.
//
// Absence matters because the most capable non-Chromium devices are the
// ones missing signals. Safari and Firefox do not implement
// navigator.deviceMemory or navigator.userAgentData at all, and a modern
// iPhone or iPad reports a coarse pointer and a mobile UA while running
// these scenes comfortably. Treating any of those absences or mobile
// hints as disqualifying would blocklist exactly the wrong hardware.
//
// Thresholds and their reasoning:
//
//   hardwareConcurrency present and <= 2
//     Genuinely low-end territory: budget Android, old tablets, heavily
//     throttled or virtualised browsers. Every iPhone since the 6s
//     reports 2 usable cores in some configurations, so this is kept
//     deliberately loose rather than at the more tempting <= 4. Safari
//     also historically clamps this value, which is another reason not
//     to tighten it. Firefox privacy-resistFingerprinting reports 2,
//     which will cost those users a background: accepted, since there is
//     no way to distinguish that from a real dual-core device.
//
//   deviceMemory present and < 2
//     Chromium-only, and the spec buckets the value to 0.25/0.5/1/2/4/8.
//     Under 2 GB means a low-RAM Android device where a WebGL scene
//     competes with the page for memory. A 4 GB cutoff was considered
//     and rejected: plenty of usable Chromebooks and mid Android phones
//     report exactly 4, and this signal is absent on the platforms that
//     would otherwise vouch for them.
//
//   renderer string matching a software rasteriser
//     SwiftShader, llvmpipe, and generic "software" renderers mean there
//     is no GPU behind the context at all. This is the single strongest
//     positive signal available and is the only one that is close to
//     conclusive. Note that headless Chromium defaults to SwiftShader,
//     so this branch is what a default headless browser hits.
//
//   handheld AND hardwareConcurrency <= 4
//     A combined signal, never any one part alone. "Handheld" means
//     either a coarse pointer with a narrow viewport, or an explicit
//     navigator.userAgentData.mobile === true, which is the only place
//     the mobile hint is consulted. Being handheld is never on its own
//     disqualifying: it only counts when the device ALSO reports at most
//     4 cores. A modern iPhone or iPad passes because it clears the core
//     count, or because it does not report one at all.
//
// Any throw anywhere resolves to false rather than propagating, so a
// hostile or exotic browser degrades to the canvas-2D fallback instead
// of breaking the page.

import { getProbedRenderer } from './webgl';

let cached: boolean | null = null;

// Viewport width, in CSS pixels, at or below which a coarse-pointer
// device is considered handheld rather than a touchscreen laptop.
const HANDHELD_MAX_WIDTH = 820;

const SOFTWARE_RENDERER_PATTERN = /swiftshader|llvmpipe|software|basic render|microsoft basic/i;

interface CapabilityNavigator extends Navigator {
  deviceMemory?: number;
  userAgentData?: { mobile?: boolean };
}

function coreCount(): number | null {
  try {
    const value = (navigator as CapabilityNavigator | undefined)?.hardwareConcurrency;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function deviceMemoryGb(): number | null {
  try {
    const value = (navigator as CapabilityNavigator | undefined)?.deviceMemory;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function hasCoarsePointer(): boolean {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(pointer: coarse)').matches === true;
  } catch {
    return false;
  }
}

function isUaMobile(): boolean {
  try {
    return (navigator as CapabilityNavigator | undefined)?.userAgentData?.mobile === true;
  } catch {
    return false;
  }
}

function viewportWidth(): number | null {
  try {
    if (typeof window === 'undefined') return null;
    const value = window.innerWidth;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function isSoftwareRenderer(): boolean {
  try {
    const renderer = getProbedRenderer();
    if (!renderer) return false;
    return SOFTWARE_RENDERER_PATTERN.test(renderer);
  } catch {
    return false;
  }
}

function evaluate(): boolean {
  if (typeof window === 'undefined') return false;

  const cores = coreCount();
  if (cores !== null && cores <= 2) return false;

  const memory = deviceMemoryGb();
  if (memory !== null && memory < 2) return false;

  if (isSoftwareRenderer()) return false;

  const width = viewportWidth();
  const smallCoarse = hasCoarsePointer() && width !== null && width <= HANDHELD_MAX_WIDTH;
  const handheld = smallCoarse || isUaMobile();
  if (handheld && cores !== null && cores <= 4) return false;

  return true;
}

// True when this device looks capable of running the 3D background
// scenes at an acceptable frame rate. Synchronous, cached, and never
// throws.
export function canRunDepthScenes(): boolean {
  if (cached !== null) return cached;
  try {
    cached = evaluate();
  } catch {
    cached = false;
  }
  return cached;
}
