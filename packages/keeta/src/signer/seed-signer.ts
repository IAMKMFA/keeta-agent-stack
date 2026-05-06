import * as KeetaSDK from '@keetanetwork/keetanet-client';
import type { KeetaNetworkName } from '../network-types.js';
import type { KeetaSigningAccount, SignerProvider } from './types.js';

export interface SeedSignerOptions {
  seed: string;
  network: KeetaNetworkName;
  accountIndex?: number;
}

export function createSeedSigningAccount(options: SeedSignerOptions): KeetaSigningAccount {
  return KeetaSDK.lib.Account.fromSeed(options.seed, options.accountIndex ?? 0);
}

export class SeedSigner implements SignerProvider {
  readonly kind = 'seed' as const;
  readonly network: KeetaNetworkName;
  private readonly account: KeetaSigningAccount;

  constructor(options: SeedSignerOptions) {
    this.network = options.network;
    this.account = createSeedSigningAccount(options);
  }

  async getAccount(): Promise<KeetaSigningAccount> {
    return this.account;
  }

  async getPublicKey(): Promise<string> {
    return this.account.publicKeyString.get();
  }
}
