import type { ExecutionIntent, SimulationResult } from '@keeta-agent-sdk/types';

export interface SdkClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

async function parseJson<T>(res: Response | Promise<Response>): Promise<T> {
  const r = await res;
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status}: ${body}`);
  }
  return r.json() as Promise<T>;
}

export function createClient(opts: SdkClientOptions) {
  const fetchFn = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, '');

  return {
    health: () => parseJson<{ ok: boolean }>(fetchFn(`${base}/health`)),

    listAdapters: () => parseJson<unknown>(fetchFn(`${base}/adapters`)),

    createIntent: (body: Omit<ExecutionIntent, 'id' | 'createdAt'>) =>
      parseJson<ExecutionIntent>(
        fetchFn(`${base}/intents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      ),

    getIntent: (id: string) =>
      parseJson<ExecutionIntent>(fetchFn(`${base}/intents/${id}`)),

    quoteIntent: (id: string) =>
      parseJson<{ jobId: string }>(
        fetchFn(`${base}/intents/${id}/quote`, { method: 'POST' })
      ),

    routeIntent: (id: string) =>
      parseJson<{ jobId: string }>(
        fetchFn(`${base}/intents/${id}/route`, { method: 'POST' })
      ),

    policyIntent: (id: string) =>
      parseJson<{ jobId: string }>(
        fetchFn(`${base}/intents/${id}/policy`, { method: 'POST' })
      ),

    executeIntent: (id: string) =>
      parseJson<{ jobId: string }>(
        fetchFn(`${base}/intents/${id}/execute`, { method: 'POST' })
      ),

    runSimulation: (body: { intentId: string; routePlanId: string }) =>
      parseJson<{ jobId: string }>(
        fetchFn(`${base}/simulations/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      ),

    getSimulation: (id: string) =>
      parseJson<SimulationResult>(fetchFn(`${base}/simulations/${id}`)),
  };
}
