import { AnchorChip } from '../../components/AnchorChip';
import { PresetSelector } from '../../components/PresetSelector';
import { ReceiptDrawer } from '../../components/ReceiptDrawer';
import { RouteBreakdownCard } from '../../components/RouteBreakdownCard';
import { RouteGraph } from '../../components/RouteGraph';
import { buildDemoRoute, presets } from '../../lib/presets';

const rampPresets = presets.filter((preset) =>
  ['fiat-on-ramp', 'fiat-off-ramp', 'card-payout'].includes(preset.id)
);

export default async function RampsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const params = await searchParams;
  const activeId = rampPresets.some((preset) => preset.id === params.preset)
    ? params.preset!
    : 'fiat-on-ramp';
  const { preset, route } = await buildDemoRoute(activeId);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-[280px_1fr_320px]">
      <aside>
        <p className="mb-3 text-xs uppercase text-zinc-500">Ramp flow</p>
        <PresetSelector presets={rampPresets} activeId={activeId} />
      </aside>
      <section className="space-y-5">
        <div>
          <p className="text-sm uppercase text-keeta">{preset.eyebrow}</p>
          <h1 className="mt-2 text-4xl font-semibold">{preset.title}</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">{preset.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AnchorChip label="fiat anchor" />
          <AnchorChip label="Keeta settlement" />
          <AnchorChip label="receipt preview" />
        </div>
        <RouteGraph route={route} />
      </section>
      <aside className="space-y-5">
        <RouteBreakdownCard route={route} />
        <ReceiptDrawer route={route} />
      </aside>
    </main>
  );
}
