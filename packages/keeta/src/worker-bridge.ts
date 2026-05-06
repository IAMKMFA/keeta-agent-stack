import { UserClient } from '@keetanetwork/keetanet-client';
import type { AppEnv } from '@keeta-agent-stack/config';
import { assertWorkerSigningRuntime } from '@keeta-agent-stack/custody-guards';
import { createSeedSigningAccount } from './signer/seed-signer.js';
import type { SignerProvider } from './signer/types.js';

/**
 * Read-only client for chain queries (balances, chain health via underlying Client).
 */
export function createReadOnlyUserClient(env: Pick<AppEnv, 'KEETA_NETWORK'>): UserClient {
  return UserClient.fromNetwork(env.KEETA_NETWORK, null);
}

/**
 * Signing client for live execution — **only call in worker** with `KEETA_SIGNING_SEED` set.
 *
 * Custody guard: this function is the innermost legitimate signing boundary in the seed-only
 * code path. It calls `assertWorkerSigningRuntime()` to refuse construction in any runtime
 * other than `worker` or `test`. See `packages/custody-guards` and `docs/security/CUSTODY_GUARD_AUDIT.md`.
 */
export function createSigningUserClient(
  env: Pick<AppEnv, 'KEETA_NETWORK' | 'KEETA_SIGNING_SEED' | 'KEETA_ACCOUNT_INDEX'>
): UserClient {
  assertWorkerSigningRuntime();
  const seed = env.KEETA_SIGNING_SEED;
  if (!seed) {
    throw new Error('KEETA_SIGNING_SEED is required to create a signing UserClient');
  }
  const account = createSeedSigningAccount({
    seed,
    network: env.KEETA_NETWORK,
    accountIndex: env.KEETA_ACCOUNT_INDEX,
  });
  return UserClient.fromNetwork(env.KEETA_NETWORK, account as never);
}

/**
 * Construct a signing client from a pre-built `SignerProvider` (seed or KMS-backed).
 *
 * Custody guard: matches `createSigningUserClient` — refuses to run outside `worker`/`test`.
 */
export async function createSigningUserClientFromSigner(
  env: Pick<AppEnv, 'KEETA_NETWORK'>,
  signer: SignerProvider
): Promise<UserClient> {
  assertWorkerSigningRuntime();
  const account = await signer.getAccount();
  return UserClient.fromNetwork(env.KEETA_NETWORK, account as never);
}
