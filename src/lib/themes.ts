// Theme registry for the CLI colour-theme picker (stage 1: tokens only,
// no consumer yet). Each entry mirrors one of the `:root[data-theme="..."]`
// blocks defined in src/index.css: same id, same background hex, and the
// two accent hexes a picker uses to render swatches without re-reading the
// stylesheet at runtime. Keep these hexes in sync with index.css by hand;
// there is no build-time link between the two, so a theme edit needs both
// files touched.
//
// This module has no importers yet. Stage 2 (the theme-picker UI) wires it
// into a component and a `document.documentElement.dataset.theme` writer;
// stage 1 only establishes the typed registry those later stages consume.

export interface ThemeDefinition {
  id: string;
  label: string;
  /** Background hex, matches that theme's --cli-bg in src/index.css. */
  bg: string;
  /** Primary accent hex, matches that theme's --cli-cyan. */
  primary: string;
  /** Secondary accent hex, matches that theme's --cli-sakura. */
  secondary: string;
}

export const THEMES = [
  { id: 'default', label: 'Default', bg: '#121319', primary: '#00ced1', secondary: '#e75480' },
  { id: 'cherry-blossom', label: 'Cherry Blossom', bg: '#17101a', primary: '#E84393', secondary: '#DB4A93' },
  { id: 'dark-sakura', label: 'Dark Sakura', bg: '#1A0F15', primary: '#FF6B9D', secondary: '#FFB0CC' },
  { id: 'arctic', label: 'Arctic', bg: '#0A1420', primary: '#0288D1', secondary: '#1490D8' },
  { id: 'outer-space', label: 'Outer Space', bg: '#05050F', primary: '#7C5CFC', secondary: '#B8A9FF' },
  { id: 'nord', label: 'Nord', bg: '#2E3440', primary: '#88C0D0', secondary: '#81A1C1' },
] as const satisfies readonly ThemeDefinition[];

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_THEME_ID: ThemeId = 'default';

// Single source of truth for the localStorage key both the React picker
// (ThemePicker.tsx) and the pre-paint inline script in index.html read and
// write. index.html cannot import this module, so its copy is a hardcoded
// string literal; themes.test.ts parses index.html and asserts that literal
// matches this constant so the two cannot silently drift apart.
export const THEME_STORAGE_KEY = 'cli-theme';

const THEME_ID_SET = new Set<string>(THEMES.map((theme) => theme.id));

export function isThemeId(value: string): value is ThemeId {
  return THEME_ID_SET.has(value);
}
