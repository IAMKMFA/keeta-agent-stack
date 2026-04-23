import { Card, StatusPill } from '../ui';
import { shortId } from '../../lib/format';

interface ChainHealth {
  ok: boolean;
  network: string;
  latencyMs: number;
  apiLatencyMs?: number;
  ledger?: { blockCount: number; transactionCount: number; representativeCount: number };
  networkInfo?: { baseToken: string; networkAddress: string } | null;
  errorMessage?: string;
}

export function ChainHealthCard({ chain }: { chain: ChainHealth | null }) {
  return (
    <Card
      kicker="Chain truth"
      title="Keeta network"
      actions={
        chain ? (
          <StatusPill tone={chain.ok ? 'success' : 'danger'}>
            {chain.ok ? 'Healthy' : 'Degraded'}
          </StatusPill>
        ) : (
          <StatusPill tone="neutral">No sample</StatusPill>
        )
      }
    >
      {chain ? (
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-[var(--keeta-muted)]">Network</dt>
            <dd className="font-mono text-[13px] text-[var(--keeta-ink)]">{chain.network}</dd>
          </div>
          <div>
            <dt className="text-[var(--keeta-muted)]">Node RTT</dt>
            <dd className="font-mono text-[13px] text-[var(--keeta-ink)]">{chain.latencyMs} ms</dd>
          </div>
          <div>
            <dt className="text-[var(--keeta-muted)]">API RTT</dt>
            <dd className="font-mono text-[13px] text-[var(--keeta-ink)]">
              {chain.apiLatencyMs ?? '—'} ms
            </dd>
          </div>
          <div>
            <dt className="text-[var(--keeta-muted)]">Blocks</dt>
            <dd className="font-mono text-[13px] text-[var(--keeta-ink)]">
              {chain.ledger?.blockCount ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--keeta-muted)]">Representatives</dt>
            <dd className="font-mono text-[13px] text-[var(--keeta-ink)]">
              {chain.ledger?.representativeCount ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--keeta-muted)]">Transactions</dt>
            <dd className="font-mono text-[13px] text-[var(--keeta-ink)]">
              {chain.ledger?.transactionCount ?? '—'}
            </dd>
          </div>
          {chain.networkInfo ? (
            <div className="md:col-span-2">
              <dt className="text-[var(--keeta-muted)]">Base token</dt>
              <dd className="mt-1 font-mono text-xs text-[var(--keeta-ink)]">
                {shortId(chain.networkInfo.baseToken, 14)}
              </dd>
            </div>
          ) : null}
          {chain.errorMessage ? (
            <div className="md:col-span-2 rounded-xl border border-[rgba(204,147,56,0.42)] bg-[rgba(204,147,56,0.08)] px-3 py-2 text-sm text-[var(--keeta-warning)]">
              {chain.errorMessage}
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="text-sm text-[var(--keeta-muted)]">
          No chain health sample yet. The health worker will write one shortly.
        </p>
      )}
    </Card>
  );
}
