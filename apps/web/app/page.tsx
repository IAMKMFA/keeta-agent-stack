import { Hero } from '../components/Hero';
import { PolicyDecisionCard } from '../components/PolicyDecisionCard';
import { RouteBreakdownCard } from '../components/RouteBreakdownCard';
import { RouteGraph } from '../components/RouteGraph';
import { buildDemoRoute, presets } from '../lib/presets';

export default async function Home() {
  const demos = await Promise.all(
    ['cross-chain-stable', 'fiat-on-ramp', 'agent-api-payment'].map((id) => buildDemoRoute(id))
  );

  return (
    <main>
      <Hero />
      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="mb-6">
          <p className="text-sm uppercase text-keeta">Representative routes</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Real pipeline, simulated rails</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {demos.map(({ preset, route, policyDecision }) => (
            <div key={preset.id} className="rounded-lg border border-white/10 bg-panel p-5">
              <p className="text-xs uppercase text-zinc-500">{preset.eyebrow}</p>
              <h3 className="mt-2 text-xl font-semibold">{preset.title}</h3>
              <p className="mt-2 min-h-16 text-sm leading-6 text-zinc-400">{preset.description}</p>
              <div className="mt-5">
                <RouteBreakdownCard route={route} />
              </div>
              <div className="mt-5">
                <PolicyDecisionCard decision={policyDecision} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <RouteGraph route={demos[2]?.route} />
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          Loaded {presets.length} typed `ExecutionIntent` presets through the existing router and
          policy engine.
        </p>
      </section>
    </main>
  );
}
