import { DataTable } from '../../components/DataTable';
import { fetchJson } from '../../lib/api';

export default async function Page() {
  const rows = await fetchJson<Array<{ id: string; kind: string }>>('/adapters', [
    { id: 'mock-dex', kind: 'dex' },
    { id: 'mock-anchor', kind: 'anchor' },
    { id: 'keeta-transfer', kind: 'transfer' },
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Adapters</h1>
      <DataTable columns={['id', 'kind']} rows={rows} />
    </div>
  );
}
