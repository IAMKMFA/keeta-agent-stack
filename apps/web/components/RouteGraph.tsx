import type { RoutePlan } from '@keeta-agent-stack/types';
import { DemoBadge } from './DemoBadge';
import { SupportLevelBadge } from './SupportLevelBadge';

export function RouteGraph({ route }: { route?: RoutePlan }) {
  if (!route) {
    return (
      <div className="rounded-lg border border-white/10 bg-panel p-6 text-zinc-400">No route</div>
    );
  }
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5 shadow-glow">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-zinc-500">Route graph</p>
          <h2 className="text-xl font-semibold">Keeta-centered path</h2>
        </div>
        <div className="flex gap-2">
          <SupportLevelBadge level={route.supportLevel} />
          <DemoBadge supportLevel={route.supportLevel} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {route.steps.map((step) => (
          <div
            key={`${step.stepIndex}-${step.adapterId}`}
            className="relative rounded-md border border-line bg-black/25 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs uppercase text-zinc-500">hop {step.stepIndex + 1}</span>
              <SupportLevelBadge level={step.supportLevel} />
            </div>
            <p className="font-medium text-white">{step.adapterId}</p>
            <p className="mt-2 text-sm text-zinc-400">
              {step.baseAsset} to {step.quoteAsset}
            </p>
            <p className="mt-3 text-xs text-keeta">{step.venueKind}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
