import { publicEnv } from './env';
import { getDemoPipelineRows, type DemoPipelineRow } from './demo-data';
import { DEMO_METRICS, type DemoMetric } from '@keeta-agent-stack/visualizer';
import { safeFetchJson, type SafeFetchFailureReason } from './safe-fetch';

/**
 * Read-only API client for the public website.
 *
 * Behaviour:
 *  - In demo mode (default), returns the deterministic fixtures in
 *    `lib/demo-data.ts`. No network calls happen.
 *  - In live mode, probes only public, read-only status endpoints on the
 *    configured `NEXT_PUBLIC_KEETA_API_BASE_URL`. On any failure, the UI
 *    transparently falls back to deterministic demo data.
 *
 * This client must NEVER:
 *  - Send requests with `Authorization`, `x-ops-key`, or any admin or
 *    operator credential.
 *  - Submit `ExecutionIntent`s or trigger live execution.
 *  - Call admin or policy-admin routes.
 */

const FETCH_TIMEOUT_MS = 4000;

export type PublicProbeStatus = 'ok' | 'skipped' | 'unavailable';

export interface PublicApiProbe {
  readonly id: 'health' | 'status' | 'openapi';
  readonly label: string;
  readonly path: '/health' | '/status' | '/openapi.json';
  readonly status: PublicProbeStatus;
  readonly httpStatus?: number;
  readonly reason?: SafeFetchFailureReason | 'demo-mode';
  readonly summary: string;
}

export interface PublicApiSnapshot {
  readonly mode: 'demo' | 'live' | 'fallback';
  readonly liveModeEnabled: boolean;
  readonly checkedAtIso: string;
  readonly probes: ReadonlyArray<PublicApiProbe>;
  readonly metrics: ReadonlyArray<DemoMetric>;
}

const PUBLIC_PROBES: ReadonlyArray<Omit<PublicApiProbe, 'status' | 'summary'>> = [
  { id: 'health', label: 'Health', path: '/health' },
  { id: 'status', label: 'Status', path: '/status' },
  { id: 'openapi', label: 'OpenAPI', path: '/openapi.json' },
];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function summarizeProbe(id: PublicApiProbe['id'], data: unknown): string {
  const record = asRecord(data);
  if (!record) return 'Endpoint responded with public data.';

  if (id === 'openapi') {
    const title = asRecord(record.info)?.title;
    const version = asRecord(record.info)?.version;
    if (typeof title === 'string' && typeof version === 'string') {
      return `${title} · ${version}`;
    }
    if (typeof record.openapi === 'string') return `OpenAPI ${record.openapi}`;
  }

  const status = record.status ?? record.state ?? record.ok;
  if (typeof status === 'string') return status;
  if (typeof status === 'boolean') return status ? 'ok' : 'not ok';
  return 'Endpoint responded with public data.';
}

async function probePublicEndpoint(
  probe: Omit<PublicApiProbe, 'status' | 'summary'>
): Promise<PublicApiProbe> {
  if (!publicEnv.liveMode || !publicEnv.keetaApiBaseUrl) {
    return {
      ...probe,
      status: 'skipped',
      reason: 'demo-mode',
      summary: 'Demo mode is active; no backend request was attempted.',
    };
  }

  const result = await safeFetchJson({
    baseUrl: publicEnv.keetaApiBaseUrl,
    path: probe.path,
    timeoutMs: FETCH_TIMEOUT_MS,
  });

  if (!result.ok) {
    return {
      ...probe,
      status: 'unavailable',
      reason: result.reason,
      httpStatus: result.status,
      summary: `Fell back to demo data (${result.reason}).`,
    };
  }

  return {
    ...probe,
    status: 'ok',
    httpStatus: result.status,
    summary: summarizeProbe(probe.id, result.data),
  };
}

function buildMetrics(probes: ReadonlyArray<PublicApiProbe>): ReadonlyArray<DemoMetric> {
  if (!publicEnv.liveMode) return DEMO_METRICS;

  const okCount = probes.filter((probe) => probe.status === 'ok').length;
  const unavailableCount = probes.filter((probe) => probe.status === 'unavailable').length;

  return [
    { id: 'public-probes', label: 'Public probes OK', value: okCount },
    { id: 'public-probes-fallback', label: 'Fallback probes', value: unavailableCount },
    {
      id: 'safe-timeout',
      label: 'Fetch timeout',
      value: FETCH_TIMEOUT_MS / 1000,
      suffix: 's',
      precision: 1,
    },
    ...DEMO_METRICS.slice(0, 1),
  ];
}

export async function getPublicApiSnapshot(): Promise<PublicApiSnapshot> {
  const probes = await Promise.all(PUBLIC_PROBES.map((probe) => probePublicEndpoint(probe)));
  const okCount = probes.filter((probe) => probe.status === 'ok').length;

  return {
    mode: publicEnv.liveMode ? (okCount > 0 ? 'live' : 'fallback') : 'demo',
    liveModeEnabled: publicEnv.liveMode,
    checkedAtIso: new Date().toISOString(),
    probes,
    metrics: buildMetrics(probes),
  };
}

export interface PipelineSnapshot {
  readonly rows: ReadonlyArray<DemoPipelineRow>;
  readonly source: 'demo';
  readonly api: PublicApiSnapshot;
}

export async function getPipelineSnapshot(): Promise<PipelineSnapshot> {
  const api = await getPublicApiSnapshot();
  return { rows: getDemoPipelineRows(), source: 'demo', api };
}
