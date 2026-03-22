import { DataTable } from '../../components/DataTable';

export default function Page() {
  const rows = [
    { id: 'intent-1', status: 'created', pair: 'KTA/USDC' },
    { id: 'intent-2', status: 'routed', pair: 'KTA/ETH' },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Intents</h1>
      <p className="text-slate-400 text-sm">Connect API to populate live rows.</p>
      <DataTable columns={['id', 'status', 'pair']} rows={rows} />
    </div>
  );
}
