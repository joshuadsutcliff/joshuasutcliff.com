import AboutTerminal from '../components/AboutTerminal'

// The About page is the CLI reference implementation (stage 3). The old
// feature-flagged sans-serif fallback is gone: the terminal renders
// unconditionally. src/lib/terminalFlag.ts is intentionally left on disk
// with no consumer here; a later stage retires the file.
export default function About() {
  return <AboutTerminal />
}
