import { DataTable } from '../../components/DataTable';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../components/ui';
import { fetchJson } from '../../lib/api';
import { formatNumber, shortId } from '../../lib/format';

type WalletRow = {
  id: string;
  label: string;
  address: string;
  settings?: {
    defaultPolicyPackId?: string | null;
  };
};

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wallets — Keeta Agent Hub' };

export default async function Page() {
  const rows = await fetchJson<WalletRow[]>('/wallets', []);
  const uniqueLabels = new Set(rows.map((row) => row.label)).size;

  const tableRows = rows.map((row) => ({
    _key: row.id,
    id: <span className="font-mono text-xs">{shortId(row.id)}</span>,
    label: row.label,
    address: (
      <div className="space-y-0.5">
        <div className="font-mono text-xs">{shortId(row.address, 10)}</div>
        <div className="font-mono text-[11px] text-[var(--keeta-muted)]">
          {row.address}
        </div>
      </div>
    ),
    policyPack: (
      <div className="space-y-0.5">
        <div className="font-mono text-xs">
          {row.settings?.defaultPolicyPackId
            ? shortId(row.settings.defaultPolicyPackId)
            : '—'}
        </div>
        <div className="text-[11px] text-[var(--keeta-muted)]">
          {row.settings?.defaultPolicyPackId ? 'wallet default' : 'none'}
        </div>
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Identity layer"
        title="Wallets"
        description="Imported wallets available for intent origination and balance snapshots."
        meta={<StatusPill tone="info">{formatNumber(rows.length)} wallets</StatusPill>}
      />

      <KpiGrid columns={3}>
        <Kpi label="Wallets" value={formatNumber(rows.length)} hint="Imported into storage" />
        <Kpi label="Unique labels" value={formatNumber(uniqueLabels)} hint="Naming coverage" />
        <Kpi
          label="Address book"
          value={rows.length > 0 ? 'Ready' : 'Empty'}
          hint="POST /wallets/import"
        />
      </KpiGrid>

      <Card kicker="Directory" title="All wallets" padding="sm">
        <DataTable
          columns={[
            { key: 'id', label: 'Wallet ID' },
            { key: 'label', label: 'Label' },
            { key: 'address', label: 'Address' },
            { key: 'policyPack', label: 'Default Policy Pack' },
          ]}
          rows={tableRows}
          rowKey={(row) => String(row._key)}
          emptyMessage="No wallets found. Import one using POST /wallets/import."
        />
      </Card>
    </div>
  );
}
