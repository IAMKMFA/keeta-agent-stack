import { StatusCard } from '../components/StatusCard';
import { McpToolConsole } from '../components/McpToolConsole';
import { OracleAutopilotForm } from '../components/OracleAutopilotForm';
import { fetchJson, isApiConfigured } from '../lib/api';
import { formatDateTime, formatNumber, shortId } from '../lib/format';

type Modes = {
  liveMode: boolean;
  keetaNetwork: string;
  mockAdapters: boolean;
  executionKillSwitch: boolean;
};

type ChainHealth = {
  ok: boolean;
  network: string;
  measuredAt: string;
  latencyMs: number;
  apiLatencyMs?: number;
  ledger?: { blockCount: number; transactionCount: number; representativeCount: number };
  errorMessage?: string;
  networkInfo?: { baseToken: string; networkAddress: string } | null;
};

type AdapterRow = { id: string; kind: string };
type AdapterHealth = { adapterId: string; ok: boolean; latencyMs?: number; checkedAt?: string };
type IntentRow = { status: string; approvalStatus: string; createdAt: string };
type RouteRow = { score: number; createdAt: string };
type ExecutionRow = { status: string; createdAt: string };
type SimulationRow = { status: string; createdAt: string };
type OracleStatus = { ok: boolean; data?: { status?: string } };
type OracleToolsResponse = { ok: boolean; count: number; tools: OracleMcpTool[] };
type OracleMcpTool = {
  name: string;
  description?: string;
  inputSchema?: { type?: string; properties?: Record<string, unknown>; required?: string[] };
};

export default async function Page() {
  const [
    modes,
    health,
    adapters,
    adapterHealth,
    chain,
    intents,
    routes,
    executions,
    simulations,
    oracleStatus,
    oracleTools,
  ] = await Promise.all([
    fetchJson<Modes>('/config/modes', {
      liveMode: false,
      keetaNetwork: 'test',
      mockAdapters: true,
      executionKillSwitch: false,
    }),
    fetchJson<{ ok: boolean }>('/health', { ok: false }),
    fetchJson<AdapterRow[]>('/adapters', []),
    fetchJson<AdapterHealth[]>('/adapters/health', []),
    fetchJson<ChainHealth | null>('/chain/health', null),
    fetchJson<IntentRow[]>('/intents', []),
    fetchJson<RouteRow[]>('/routes', []),
    fetchJson<ExecutionRow[]>('/executions', []),
    fetchJson<SimulationRow[]>('/simulations', []),
    fetchJson<OracleStatus | null>('/oracle/status', null),
    fetchJson<OracleToolsResponse>('/oracle/mcp/tools', { ok: false, count: 0, tools: [] }),
  ]);

  const apiReady = isApiConfigured();
  const pendingApprovals = intents.filter((intent) => intent.approvalStatus === 'pending').length;
  const heldIntents = intents.filter((intent) => intent.status === 'held').length;
  const unsettledExecutions = executions.filter((execution) =>
    ['pending', 'submitted'].includes(execution.status)
  ).length;
  const adapterFailures = adapterHealth.filter((entry) => !entry.ok).length;
  const latestIntentAt = intents[0]?.createdAt;
  const latestExecutionAt = executions[0]?.createdAt;
  const latestRoute = routes[0];
  const latestSimulation = simulations[0];

  return (
    <div className="space-y-8">
      <div>
        <div className="hub-kicker">Mission Control</div>
        <h1 className="hub-heading mt-1 text-3xl font-semibold">Keeta Agent Hub Overview</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--hub-muted)]">
          Real-time operating surface for intents, route quality, execution settlement, and Oracle-assisted
          payment playbooks.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="hub-pill px-3 py-1.5">{apiReady ? 'API linked' : 'API missing'}</span>
        <span className="hub-pill px-3 py-1.5">Network: {modes.keetaNetwork}</span>
        <span
          className={`hub-pill px-3 py-1.5 ${
            modes.liveMode
              ? 'border-[rgba(204,147,56,0.5)] bg-[rgba(204,147,56,0.12)] text-[#92681e]'
              : 'border-[rgba(128,127,127,0.3)]'
          }`}
        >
          {modes.liveMode ? 'Live mode' : 'Sim / dry-run'}
        </span>
        <span className="hub-pill px-3 py-1.5">
          {modes.mockAdapters ? 'Mock adapters' : 'Production adapters'}
        </span>
        <span className="hub-pill px-3 py-1.5">Oracle: {oracleStatus?.ok ? 'online' : 'unavailable'}</span>
        {modes.executionKillSwitch ? (
          <span className="hub-pill border-[rgba(190,63,67,0.45)] bg-[rgba(190,63,67,0.1)] px-3 py-1.5 text-[var(--hub-danger)]">
            Kill switch enabled
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          title="API health"
          value={health.ok ? 'Healthy' : 'Offline'}
          hint={health.ok ? 'Core API responding' : 'Check API process / env'}
          tone={health.ok ? 'good' : 'danger'}
        />
        <StatusCard
          title="Intents"
          value={formatNumber(intents.length)}
          hint={`Pending approvals: ${formatNumber(pendingApprovals)}`}
          tone={pendingApprovals > 0 ? 'warn' : 'neutral'}
        />
        <StatusCard
          title="Active executions"
          value={formatNumber(unsettledExecutions)}
          hint={`Total: ${formatNumber(executions.length)}`}
          tone={unsettledExecutions > 0 ? 'warn' : 'good'}
        />
        <StatusCard
          title="Oracle MCP tools"
          value={formatNumber(oracleTools.count)}
          hint={oracleTools.ok ? 'Mirrored via API proxy' : 'Oracle endpoint unavailable'}
          tone={oracleTools.ok ? 'good' : 'warn'}
        />
        <StatusCard
          title="Registered adapters"
          value={formatNumber(adapters.length)}
          hint={adapterFailures > 0 ? `${adapterFailures} unhealthy` : 'All healthy'}
          tone={adapterFailures > 0 ? 'warn' : 'good'}
        />
        <StatusCard
          title="Route plans"
          value={formatNumber(routes.length)}
          hint={latestRoute ? `Latest score ${latestRoute.score.toFixed(3)}` : 'No routes yet'}
        />
        <StatusCard
          title="Simulations"
          value={formatNumber(simulations.length)}
          hint={latestSimulation ? `Latest status ${latestSimulation.status}` : 'No runs yet'}
        />
        <StatusCard
          title="Held intents"
          value={formatNumber(heldIntents)}
          hint={latestIntentAt ? `Latest ${formatDateTime(latestIntentAt)}` : 'No intents ingested'}
          tone={heldIntents > 0 ? 'warn' : 'neutral'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="hub-soft-panel space-y-4 p-5">
          <div>
            <div className="hub-kicker">Chain Truth</div>
            <h2 className="hub-heading text-xl font-semibold">Keeta network observability</h2>
          </div>
          {chain ? (
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div>
                <div className="text-[var(--hub-muted)]">Network</div>
                <div className="font-mono text-[13px]">{chain.network}</div>
              </div>
              <div>
                <div className="text-[var(--hub-muted)]">Status</div>
                <div>{chain.ok ? 'Healthy' : 'Degraded'}</div>
              </div>
              <div>
                <div className="text-[var(--hub-muted)]">Node RTT</div>
                <div className="font-mono text-[13px]">{chain.latencyMs} ms</div>
              </div>
              <div>
                <div className="text-[var(--hub-muted)]">API measured</div>
                <div className="font-mono text-[13px]">{chain.apiLatencyMs ?? '—'} ms</div>
              </div>
              <div>
                <div className="text-[var(--hub-muted)]">Ledger blocks</div>
                <div className="font-mono text-[13px]">{chain.ledger?.blockCount ?? '—'}</div>
              </div>
              <div>
                <div className="text-[var(--hub-muted)]">Representatives</div>
                <div className="font-mono text-[13px]">{chain.ledger?.representativeCount ?? '—'}</div>
              </div>
              {chain.networkInfo ? (
                <div className="md:col-span-2">
                  <div className="text-[var(--hub-muted)]">Base token</div>
                  <div className="mt-1 font-mono text-xs">{shortId(chain.networkInfo.baseToken, 14)}</div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-[var(--hub-muted)]">No chain health sample available yet.</p>
          )}
        </section>

        <section className="hub-soft-panel space-y-4 p-5">
          <div>
            <div className="hub-kicker">Pipeline</div>
            <h2 className="hub-heading text-xl font-semibold">Execution throughput snapshot</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[var(--hub-muted)]">Latest intent</div>
              <div className="font-mono text-[13px]">{formatDateTime(latestIntentAt)}</div>
            </div>
            <div>
              <div className="text-[var(--hub-muted)]">Latest execution</div>
              <div className="font-mono text-[13px]">{formatDateTime(latestExecutionAt)}</div>
            </div>
            <div>
              <div className="text-[var(--hub-muted)]">Routes planned</div>
              <div className="font-mono text-[13px]">{formatNumber(routes.length)}</div>
            </div>
            <div>
              <div className="text-[var(--hub-muted)]">Sim runs</div>
              <div className="font-mono text-[13px]">{formatNumber(simulations.length)}</div>
            </div>
          </div>
          {latestRoute ? (
            <div className="rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 text-sm">
              <span className="text-[var(--hub-muted)]">Latest route score:</span>{' '}
              <span className="font-mono">{latestRoute.score.toFixed(4)}</span>
            </div>
          ) : null}
          {chain && !chain.ok && chain.errorMessage ? (
            <div className="rounded-xl border border-[rgba(204,147,56,0.42)] bg-[rgba(204,147,56,0.08)] px-3 py-2 text-sm text-[#92681e]">
              {chain.errorMessage}
            </div>
          ) : null}
        </section>
      </div>

      <section className="hub-soft-panel p-5">
        <OracleAutopilotForm />
      </section>

      <section className="hub-soft-panel p-5">
        <McpToolConsole initialTools={oracleTools.tools} />
      </section>
    </div>
  );
}
