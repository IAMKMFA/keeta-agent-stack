import { DataTable } from '../../components/DataTable';
import { fetchJson } from '../../lib/api';

export default async function Page() {
  const rows = await fetchJson<Array<{ id: string; label: string; address: string }>>(
    '/wallets',
    [{ id: 'demo', label: 'mock-wallet', address: 'kta1mock...' }]
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Wallets</h1>
      <DataTable columns={['id', 'label', 'address']} rows={rows} />
    </div>
  );
}
