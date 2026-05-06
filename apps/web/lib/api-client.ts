import { publicEnv } from './env';
import { getDemoPipelineRows, type DemoPipelineRow } from './demo-data';

/**
 * Read-only API client for the public website.
 *
 * Behaviour:
 *  - In demo mode (default), returns the deterministic fixtures in
 *    `lib/demo-data.ts`. No network calls happen.
 *  - In live mode, attempts a single GET to a public, read-only endpoint
 *    on the configured `NEXT_PUBLIC_KEETA_API_BASE_URL`. On any failure
 *    (network, non-200, JSON parse error, schema mismatch) the function
 *    transparently falls back to demo data.
 *
 * This client must NEVER:
 *  - Send requests with `Authorization`, `x-ops-key`, or any admin or
 *    operator credential.
 *  - Submit `ExecutionIntent`s or trigger live execution.
 *  - Call admin or policy-admin routes.
 */

const FETCH_TIMEOUT_MS = 4000;

interface PipelineSnapshotResponse {
  readonly rows: ReadonlyArray<DemoPipelineRow>;
}

function isPipelineSnapshotResponse(value: unknown): value is PipelineSnapshotResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { rows?: unknown };
  return Array.isArray(candidate.rows);
}

async function fetchPipelineSnapshotLive(): Promise<ReadonlyArray<DemoPipelineRow> | undefined> {
  if (!publicEnv.liveMode || !publicEnv.keetaApiBaseUrl) return undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${publicEnv.keetaApiBaseUrl}/public/pipeline-snapshot`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return undefined;
    const json: unknown = await response.json();
    if (!isPipelineSnapshotResponse(json)) return undefined;
    return json.rows;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export interface PipelineSnapshot {
  readonly rows: ReadonlyArray<DemoPipelineRow>;
  readonly source: 'demo' | 'live';
}

export async function getPipelineSnapshot(): Promise<PipelineSnapshot> {
  const liveRows = await fetchPipelineSnapshotLive();
  if (liveRows && liveRows.length > 0) {
    return { rows: liveRows, source: 'live' };
  }
  return { rows: getDemoPipelineRows(), source: 'demo' };
}
