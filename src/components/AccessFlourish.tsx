export default function AccessFlourish() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center" aria-hidden="true">
      <div className="secret-pulse absolute h-24 w-24 rounded-full" />
      <p className="secret-caption font-mono text-xs uppercase tracking-[0.2em] text-cyan">
        Access channel open
      </p>
    </div>
  )
}
