import { DataTable } from '../../components/DataTable';

export default function Page() {
  const rows = [{ id: 'route-1', score: '-1.25', hops: '1' }];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Routes</h1>
      <DataTable columns={['id', 'score', 'hops']} rows={rows} />
    </div>
  );
}
