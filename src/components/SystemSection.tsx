import { LAYERS, SYSTEM, FUSION, type Layer } from '../content/system'

const ORIGIN_STYLES: Record<Layer['origin'], string> = {
  Doctrine: 'text-purple border-purple/40',
  Runtime: 'text-cyan border-cyan/40',
  Blend: 'text-fg border-border-bright',
}

function LayerCard({ layer }: { layer: Layer }) {
  return (
    <article className="glass group relative flex flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-2xl font-medium text-dim">{layer.n}</span>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider ${ORIGIN_STYLES[layer.origin]}`}
        >
          {layer.origin}
        </span>
      </div>
      <h3 className="mb-2 font-display text-lg font-semibold text-fg">{layer.title}</h3>
      <p className="text-sm leading-relaxed text-muted">{layer.body}</p>
    </article>
  )
}

export default function SystemSection() {
  return (
    <section id="system" className="relative mx-auto max-w-5xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan">The system</p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          <span className="neon-text">{SYSTEM.name}</span>
        </h2>
        <p className="mt-5 text-lg text-muted">{SYSTEM.thesis}</p>
      </div>

      {/* Origin story */}
      <div className="glass mx-auto mt-12 max-w-3xl rounded-2xl p-7 sm:p-9">
        <h3 className="font-display text-xl font-semibold text-fg">{SYSTEM.origin.headline}</h3>
        <p className="mt-3 leading-relaxed text-muted">{SYSTEM.origin.body}</p>
      </div>

      {/* Layer grid */}
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {LAYERS.map((layer) => (
          <LayerCard key={layer.n} layer={layer} />
        ))}
      </div>

      {/* Fusion */}
      <div className="mx-auto mt-16 max-w-3xl text-center">
        <h3 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
          {FUSION.heading}
        </h3>
        <p className="mt-4 leading-relaxed text-muted">{FUSION.body}</p>
        <p className="mt-6 border-l-2 border-cyan pl-4 text-left text-sm italic leading-relaxed text-muted">
          {FUSION.best}
        </p>
      </div>
    </section>
  )
}
