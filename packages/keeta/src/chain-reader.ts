import { Client, type UserClient } from '@keetanetwork/keetanet-client';
import type { KeetaNetworkName } from './network-types.js';
import { KeetaConnectionError } from './errors.js';

export interface ChainHealthSnapshot {
  network: KeetaNetworkName;
  /** When this snapshot was taken (ISO) */
  measuredAt: string;
  /** Round-trip time to call the node, in ms */
  latencyMs: number;
  /** Ledger stats from the preferred representative, if available */
  ledger?: {
    blockCount: number;
    transactionCount: number;
    representativeCount: number;
  };
  ok: boolean;
  errorMessage?: string;
}

export async function readChainHealth(network: KeetaNetworkName): Promise<ChainHealthSnapshot> {
  const started = performance.now();
  const client = Client.fromNetwork(network);
  try {
    const stats = await client.getNodeStats();
    const latencyMs = Math.round(performance.now() - started);
    return {
      network,
      measuredAt: new Date().toISOString(),
      latencyMs,
      ok: true,
      ledger: {
        blockCount: stats.ledger.blockCount,
        transactionCount: stats.ledger.transactionCount,
        representativeCount: stats.ledger.representativeCount,
      },
    };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - started);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      network,
      measuredAt: new Date().toISOString(),
      latencyMs,
      ok: false,
      errorMessage: msg,
    };
  } finally {
    await client.destroy().catch(() => undefined);
  }
}

/**
 * Lightweight network info using a read-only UserClient (no signer).
 * Prefer {@link readChainHealth} for node stats; this is useful for base token + network address.
 */
export async function readNetworkInfo(userClient: UserClient): Promise<{
  baseToken: string;
  networkAddress: string;
} | null> {
  try {
    return {
      baseToken: String(userClient.baseToken),
      networkAddress: String(userClient.networkAddress),
    };
  } catch (e) {
    throw new KeetaConnectionError('Failed to read network info from UserClient', e);
  }
}
