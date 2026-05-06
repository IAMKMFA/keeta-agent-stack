import { ConnectivityTable } from '../../components/ConnectivityTable';
import { SupportLevelLegend } from '../../components/SupportLevelLegend';
import { listConnectivityRows } from '../../lib/presets';

export default async function ConnectivityPage() {
  const rows = await listConnectivityRows();
  const defaultRows = rows.filter((row) =>
    ['executable', 'agent-ready', 'simulatable'].includes(row.supportLevel)
  );

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 max-w-3xl">
        <p className="text-sm uppercase text-keeta">Connectivity</p>
        <h1 className="mt-2 text-4xl font-semibold">Honest capability matrix</h1>
        <p className="mt-3 text-zinc-400">
          Registered adapters are listed beside preset-only ambition rails. The badge is the truth
          contract.
        </p>
      </div>
      <div className="mb-6">
        <SupportLevelLegend />
      </div>
      <ConnectivityTable rows={defaultRows} />
      <details className="mt-6 rounded-lg border border-white/10 bg-panel p-5">
        <summary className="cursor-pointer text-sm font-medium text-zinc-200">
          Show listed-only ambition
        </summary>
        <div className="mt-4">
          <ConnectivityTable rows={rows} />
        </div>
      </details>
    </main>
  );
}
