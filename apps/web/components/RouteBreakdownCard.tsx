import type { RoutePlan } from '@keeta-agent-stack/types';

export function RouteBreakdownCard({ route }: { route?: RoutePlan }) {
  const stats = [
    ['Hops', route?.hopCount ?? 0],
    ['Fee bps', route?.totalFeeBps ?? 0],
    ['Slippage bps', route?.expectedSlippageBps ?? 0],
    ['Score', route?.score.toFixed(2) ?? '0'],
  ];
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-5">
      <p className="text-xs uppercase text-zinc-500">Route breakdown</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-black/20 p-3">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
