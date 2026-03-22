import { DataTable } from '../../components/DataTable';

export default function Page() {
  const rows = [{ id: 'sim-1', success: 'true', slippageBps: '12' }];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Simulations</h1>
      <DataTable columns={['id', 'success', 'slippageBps']} rows={rows} />
    </div>
  );
}
