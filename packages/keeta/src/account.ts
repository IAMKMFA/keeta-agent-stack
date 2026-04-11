import { Client } from '@keetanetwork/keetanet-client';
import type { KeetaNetworkName } from './network-types.js';
import { KeetaConnectionError } from './errors.js';

export interface KeetaAccount {
  address: string;
  currentHeadBlock: string | null;
  currentHeadBlockHeight: string | null;
}

export class AccountManager {
  constructor(private readonly network: KeetaNetworkName) {}

  async getAccount(address: string): Promise<KeetaAccount | null> {
    const client = Client.fromNetwork(this.network);
    try {
      const info = await client.getAccountInfo(address);
      return {
        address,
        currentHeadBlock: info.currentHeadBlock,
        currentHeadBlockHeight: info.currentHeadBlockHeight,
      };
    } catch (e) {
      throw new KeetaConnectionError(`getAccountInfo failed for ${address}`, e);
    } finally {
      await client.destroy().catch(() => undefined);
    }
  }
}
