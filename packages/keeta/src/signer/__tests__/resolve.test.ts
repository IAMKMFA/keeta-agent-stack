import { describe, expect, it } from 'vitest';
import { GcpKmsSigner } from '../gcp-kms-signer.js';
import { resolveSigner, type SignerEnv } from '../resolve.js';
import { SeedSigner } from '../seed-signer.js';

const baseEnv: SignerEnv = {
  KEETA_NETWORK: 'test',
};
const validSeed = '11'.repeat(32);

describe('resolveSigner', () => {
  it.each([
    [
      'uses gcp kms when provider and key are present',
      {
        ...baseEnv,
        KEETA_KMS_PROVIDER: 'gcp',
        KEETA_KMS_KEY: 'projects/p/locations/l/keyRings/r/cryptoKeys/k',
      },
      GcpKmsSigner,
    ],
    [
      'falls back to seed when kms provider is unset',
      { ...baseEnv, KEETA_SIGNING_SEED: validSeed, KEETA_ACCOUNT_INDEX: 2 },
      SeedSigner,
    ],
    [
      'falls back to seed when gcp provider is set without a key',
      { ...baseEnv, KEETA_KMS_PROVIDER: 'gcp', KEETA_SIGNING_SEED: validSeed },
      SeedSigner,
    ],
    [
      'prefers gcp kms over seed when both are configured',
      {
        ...baseEnv,
        KEETA_KMS_PROVIDER: 'gcp',
        KEETA_KMS_KEY: 'projects/p/locations/l/keyRings/r/cryptoKeys/k',
        KEETA_SIGNING_SEED: validSeed,
      },
      GcpKmsSigner,
    ],
  ])('%s', (_name, env, expectedClass) => {
    expect(resolveSigner(env)).toBeInstanceOf(expectedClass);
  });

  it('throws a clear error when neither signing path is configured', () => {
    expect(() => resolveSigner(baseEnv)).toThrow(
      /KEETA_KMS_PROVIDER=gcp with KEETA_KMS_KEY, or KEETA_SIGNING_SEED/
    );
  });
});
