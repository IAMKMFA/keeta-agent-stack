import * as KeetaSDK from '@keetanetwork/keetanet-client';

type AccountKeyAlgorithm =
  (typeof KeetaSDK.lib.Account.AccountKeyAlgorithm)[keyof typeof KeetaSDK.lib.Account.AccountKeyAlgorithm];

export type KeetaWalletKeyAlgorithm = 'SECP256K1' | 'SECP256R1' | 'ED25519';

export interface CreateKeetaWalletOptions {
  index?: number;
  algorithm?: KeetaWalletKeyAlgorithm;
}

export interface CreatedKeetaWallet {
  seed: string;
  address: string;
  index: number;
  algorithm: KeetaWalletKeyAlgorithm;
}

function resolveAlgorithm(algorithm: KeetaWalletKeyAlgorithm | undefined): AccountKeyAlgorithm {
  const resolved = algorithm ?? 'SECP256K1';
  const mapping: Record<KeetaWalletKeyAlgorithm, AccountKeyAlgorithm> = {
    SECP256K1: KeetaSDK.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256K1,
    SECP256R1: KeetaSDK.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256R1,
    ED25519: KeetaSDK.lib.Account.AccountKeyAlgorithm.ED25519,
  };
  return mapping[resolved];
}

function assertWalletIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Wallet index must be a non-negative integer, received "${index}"`);
  }
}

export function createKeetaWallet(options: CreateKeetaWalletOptions = {}): CreatedKeetaWallet {
  const index = options.index ?? 0;
  assertWalletIndex(index);
  const algorithm = options.algorithm ?? 'SECP256K1';

  const seed = KeetaSDK.lib.Account.generateRandomSeed({ asString: true }) as string;
  const account = KeetaSDK.lib.Account.fromSeed(seed, index, resolveAlgorithm(algorithm));

  return {
    seed,
    address: account.publicKeyString.get(),
    index,
    algorithm,
  };
}
