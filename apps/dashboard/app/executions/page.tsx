import { DataTable } from '../../components/DataTable';

export default function Page() {
  const rows = [{ id: 'exec-1', status: 'confirmed', adapter: 'mock-dex' }];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Executions</h1>
      <DataTable columns={['id', 'status', 'adapter']} rows={rows} />
    </div>
  );
}
