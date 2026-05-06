import { PresetSelector } from '../../components/PresetSelector';
import { ReceiptDrawer } from '../../components/ReceiptDrawer';
import { RouteBreakdownCard } from '../../components/RouteBreakdownCard';
import { RouteGraph } from '../../components/RouteGraph';
import { RouteModeToggle } from '../../components/RouteModeToggle';
import { buildDemoRoute, presets } from '../../lib/presets';

const swapPresets = presets.filter((preset) =>
  ['cross-chain-stable', 'stable-corridor', 'experimental-wormhole'].includes(preset.id)
);

export default async function SuperSwapPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const params = await searchParams;
  const activeId = swapPresets.some((preset) => preset.id === params.preset)
    ? params.preset!
    : 'cross-chain-stable';
  const { preset, route } = await buildDemoRoute(activeId);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[280px_1fr_320px]">
      <aside>
        <p className="mb-3 text-xs uppercase text-zinc-500">Preset</p>
        <PresetSelector presets={swapPresets} activeId={activeId} />
      </aside>
      <section className="space-y-5">
        <div>
          <p className="text-sm uppercase text-keeta">{preset.eyebrow}</p>
          <h1 className="mt-2 text-4xl font-semibold">{preset.title}</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">{preset.description}</p>
        </div>
        <RouteModeToggle modes={['Keeta-preferred', 'Cheapest', 'Safest', 'Fastest']} />
        <RouteGraph route={route} />
      </section>
      <aside className="space-y-5">
        <RouteBreakdownCard route={route} />
        <ReceiptDrawer route={route} />
      </aside>
    </main>
  );
}
