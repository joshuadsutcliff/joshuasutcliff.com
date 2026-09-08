import AboutTerminal from '../components/AboutTerminal'

// The About page is the CLI reference implementation (stage 3). The old
// feature-flagged sans-serif fallback is gone: the terminal renders
// unconditionally, and stage 5b deleted the now-unreferenced flag module
// that used to gate it.
export default function About() {
  return <AboutTerminal />
}
