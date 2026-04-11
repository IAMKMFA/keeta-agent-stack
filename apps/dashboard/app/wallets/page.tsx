import { DataTable } from '../../components/DataTable';
import { StatusCard } from '../../components/StatusCard';
import { fetchJson } from '../../lib/api';
import { formatNumber, shortId } from '../../lib/format';

type WalletRow = {
  id: string;
  label: string;
  address: string;
};

export default async function Page() {
  const rows = await fetchJson<WalletRow[]>('/wallets', []);
  const uniqueLabels = new Set(rows.map((row) => row.label)).size;

  const tableRows = rows.map((row) => ({
    _key: row.id,
    id: <span className="font-mono text-xs">{shortId(row.id)}</span>,
    label: row.label,
    address: (
      <div className="space-y-1">
        <div className="font-mono text-xs">{shortId(row.address, 10)}</div>
        <div className="font-mono text-[11px] text-[var(--hub-muted)]">{row.address}</div>
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="hub-kicker">Identity Layer</div>
        <h1 className="hub-heading mt-1 text-3xl font-semibold">Wallets</h1>
        <p className="mt-2 text-sm text-[var(--hub-muted)]">
          Imported wallets available for intent origination and balance snapshots.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Wallets" value={formatNumber(rows.length)} hint="Imported into storage" />
        <StatusCard title="Unique labels" value={formatNumber(uniqueLabels)} hint="Naming coverage" />
        <StatusCard title="Address book" value={rows.length > 0 ? 'Ready' : 'Empty'} hint="POST /wallets/import" />
      </div>

      <section className="hub-soft-panel p-4">
        <DataTable
          columns={[
            { key: 'id', label: 'Wallet ID' },
            { key: 'label', label: 'Label' },
            { key: 'address', label: 'Address' },
          ]}
          rows={tableRows}
          rowKey={(row) => String(row._key)}
          emptyMessage="No wallets found. Import one using POST /wallets/import."
        />
      </section>
    </div>
  );
}
