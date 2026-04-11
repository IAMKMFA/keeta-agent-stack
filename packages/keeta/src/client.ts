import { UserClient } from '@keetanetwork/keetanet-client';
import type { KeetaNetworkName } from './network-types.js';
import { readChainHealth } from './chain-reader.js';
import type { ChainHealthSnapshot } from './chain-reader.js';

/**
 * Thin facade over KeetaNet read-only access. Holds a read-only `UserClient` (signer=null)
 * for account-scoped queries when connected.
 */
export class KeetaClient {
  private readonly net: KeetaNetworkName;
  private userClient: UserClient | null = null;

  constructor(network: KeetaNetworkName) {
    this.net = network;
  }

  async connect(): Promise<void> {
    if (this.userClient) {
      await this.userClient.destroy().catch(() => undefined);
    }
    this.userClient = UserClient.fromNetwork(this.net, null);
  }

  async destroy(): Promise<void> {
    if (this.userClient) {
      await this.userClient.destroy().catch(() => undefined);
      this.userClient = null;
    }
  }

  async getNetworkInfo(): Promise<{ chainId: string; name: string; baseToken: string }> {
    if (!this.userClient) {
      await this.connect();
    }
    const uc = this.userClient!;
    return {
      chainId: String(this.net),
      name: `keeta-${this.net}`,
      baseToken: String(uc.baseToken),
    };
  }

  async getChainHealth(): Promise<ChainHealthSnapshot> {
    return readChainHealth(this.net);
  }

  getNetwork(): KeetaNetworkName {
    return this.net;
  }
}
