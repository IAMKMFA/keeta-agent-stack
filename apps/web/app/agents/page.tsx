import { PolicyDecisionCard } from '../../components/PolicyDecisionCard';
import { ReceiptDrawer } from '../../components/ReceiptDrawer';
import { RouteGraph } from '../../components/RouteGraph';
import { buildDemoRoute } from '../../lib/presets';

export default async function AgentsPage() {
  const approved = await buildDemoRoute('agent-api-payment');
  const blocked = await buildDemoRoute('experimental-wormhole');

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm uppercase text-keeta">Agent control plane</p>
        <h1 className="mt-2 text-4xl font-semibold">Policy-gated agent execution</h1>
        <p className="mt-3 text-zinc-400">
          This page evaluates demo routes through the real `PolicyEngine`, including the new
          agent-payment spend cap and rail allowlist rules.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-5">
          <h2 className="text-2xl font-semibold">{approved.preset.title}</h2>
          <RouteGraph route={approved.route} />
          <PolicyDecisionCard decision={approved.policyDecision} />
          <ReceiptDrawer route={approved.route} />
        </section>
        <section className="space-y-5">
          <h2 className="text-2xl font-semibold">{blocked.preset.title}</h2>
          <RouteGraph route={blocked.route} />
          <PolicyDecisionCard decision={blocked.policyDecision} />
          <ReceiptDrawer route={blocked.route} />
        </section>
      </div>
    </main>
  );
}
