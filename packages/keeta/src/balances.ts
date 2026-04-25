import { Client } from '@keetanetwork/keetanet-client';
import type { KeetaNetworkName } from './network-types.js';
import { KeetaConnectionError } from './errors.js';

export interface BalanceEntry {
  /** Token account identifier (public string form) */
  assetId: string;
  /** Raw base units as decimal string */
  amount: string;
}

export async function getBalances(
  address: string,
  network: KeetaNetworkName
): Promise<BalanceEntry[]> {
  const client = Client.fromNetwork(network);
  try {
    const rows = await client.getAllBalances(address);
    return rows.map((r) => ({
      assetId: String(r.token),
      amount: r.balance.toString(),
    }));
  } catch (e) {
    throw new KeetaConnectionError(`getAllBalances failed for ${address}`, e);
  } finally {
    await client.destroy().catch(() => undefined);
  }
}
