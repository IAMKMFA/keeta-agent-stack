import { StatusCard } from '../components/StatusCard';
import { fetchJson } from '../lib/api';

export default async function Page() {
  const health = await fetchJson<{ ok: boolean }>('/health', { ok: true });
  const adapters = await fetchJson<{ id: string; kind: string }[]>('/adapters', [
    { id: 'mock-dex', kind: 'dex' },
    { id: 'mock-anchor', kind: 'anchor' },
    { id: 'keeta-transfer', kind: 'transfer' },
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-slate-400 mt-1">
          Adapter-first, simulation-first execution plane for Keeta agents.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="API health" value={health.ok ? 'Healthy' : 'Unknown'} hint="GET /health" />
        <StatusCard title="Registered adapters" value={String(adapters.length)} hint="Mock + transfer" />
        <StatusCard title="Mode" value="Simulation default" hint="Signing isolated from agents" />
      </div>
    </div>
  );
}
