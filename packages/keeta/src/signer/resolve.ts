import type { KeetaNetworkName } from '../network-types.js';
import { GcpKmsSigner } from './gcp-kms-signer.js';
import { SeedSigner } from './seed-signer.js';
import type { SignerProvider } from './types.js';

export interface SignerEnv {
  KEETA_NETWORK: KeetaNetworkName;
  KEETA_SIGNING_SEED?: string;
  KEETA_ACCOUNT_INDEX?: number;
  KEETA_KMS_PROVIDER?: string;
  KEETA_KMS_KEY?: string;
}

export function resolveSigner(env: SignerEnv): SignerProvider {
  if (env.KEETA_KMS_PROVIDER === 'gcp' && env.KEETA_KMS_KEY) {
    return new GcpKmsSigner({
      key: env.KEETA_KMS_KEY,
      network: env.KEETA_NETWORK,
    });
  }

  if (env.KEETA_SIGNING_SEED) {
    return new SeedSigner({
      seed: env.KEETA_SIGNING_SEED,
      network: env.KEETA_NETWORK,
      accountIndex: env.KEETA_ACCOUNT_INDEX,
    });
  }

  throw new Error(
    'Keeta live signing requires either KEETA_KMS_PROVIDER=gcp with KEETA_KMS_KEY, or KEETA_SIGNING_SEED for the seed signer'
  );
}
