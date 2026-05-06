import type { RoutePlan } from '@keeta-agent-stack/types';

export function ReceiptDrawer({ route }: { route?: RoutePlan }) {
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <p className="text-xs uppercase text-zinc-500">Receipt preview</p>
      <pre className="mt-4 overflow-auto rounded-md border border-line bg-black/30 p-4 text-xs leading-6 text-zinc-300">
        {JSON.stringify(
          {
            mode: 'simulate',
            supportLevel: route?.supportLevel,
            routePlanId: route?.id,
            steps: route?.steps.map((step) => ({
              adapterId: step.adapterId,
              pair: `${step.baseAsset}->${step.quoteAsset}`,
              supportLevel: step.supportLevel,
            })),
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}
