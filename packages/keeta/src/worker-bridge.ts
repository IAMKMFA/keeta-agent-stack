import { UserClient } from '@keetanetwork/keetanet-client';
import type { AppEnv } from '@keeta-agent-stack/config';
import * as KeetaSDK from '@keetanetwork/keetanet-client';

/**
 * Read-only client for chain queries (balances, chain health via underlying Client).
 */
export function createReadOnlyUserClient(env: Pick<AppEnv, 'KEETA_NETWORK'>): UserClient {
  return UserClient.fromNetwork(env.KEETA_NETWORK, null);
}

/**
 * Signing client for live execution — **only call in worker** with `KEETA_SIGNING_SEED` set.
 */
export function createSigningUserClient(env: Pick<AppEnv, 'KEETA_NETWORK' | 'KEETA_SIGNING_SEED' | 'KEETA_ACCOUNT_INDEX'>): UserClient {
  const seed = env.KEETA_SIGNING_SEED;
  if (!seed) {
    throw new Error('KEETA_SIGNING_SEED is required to create a signing UserClient');
  }
  const account = KeetaSDK.lib.Account.fromSeed(seed, env.KEETA_ACCOUNT_INDEX);
  return UserClient.fromNetwork(env.KEETA_NETWORK, account);
}
