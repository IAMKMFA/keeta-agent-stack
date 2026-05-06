import * as KeetaSDK from '@keetanetwork/keetanet-client';
import { describe, expect, it, vi } from 'vitest';
import { GcpKmsSigner } from '../gcp-kms-signer.js';

describe('GcpKmsSigner', () => {
  it('passes the expected package bundle and resolved key name into the Keeta KMS factory', async () => {
    const seedAccount = KeetaSDK.lib.Account.fromSeed('44'.repeat(32), 0);
    const externalKeyPair = seedAccount._getPrivateKey();
    if (!externalKeyPair) throw new Error('expected private key in seed account');
    const lookup = vi.fn(async () => externalKeyPair);
    const factory = vi.fn(() => ({ lookup }));
    const key = {
      projectId: 'project-a',
      locationId: 'global',
      keyRingId: 'ring-a',
      keyId: 'keeta-signer',
      versionId: '7',
    };

    const signer = new GcpKmsSigner(
      {
        key,
        network: 'test',
        keyType: KeetaSDK.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256K1,
      },
      {
        loadKms: async () => ({ KeyManagementServiceClient: class MockKmsClient {} }),
        loadFactory: async () => ({ KeetaGCPKMSKeyPairFactory: factory }),
      }
    );

    await signer.getAccount();

    expect(factory).toHaveBeenCalledTimes(1);
    const factoryPackageArg = (factory.mock.calls as unknown as Array<[unknown]>)[0]?.[0];
    expect(factoryPackageArg).toBeDefined();
    expect(factoryPackageArg).toMatchObject({
      KeyManagementServiceClient: expect.any(Function),
      KeetaNet: {
        lib: {
          Account: KeetaSDK.lib.Account,
          Utils: {
            Helper: KeetaSDK.lib.Utils.Helper,
            Buffer: KeetaSDK.lib.Utils.Buffer,
            ASN1: KeetaSDK.lib.Utils.ASN1,
          },
        },
      },
      crypto: { createPublicKey: expect.any(Function) },
    });
    expect(lookup).toHaveBeenCalledWith({
      key: 'projects/project-a/locations/global/keyRings/ring-a/cryptoKeys/keeta-signer/cryptoKeyVersions/7',
      keyType: KeetaSDK.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256K1,
    });
  });

  it('caches lookup results and returns the account public key', async () => {
    const seedAccount = KeetaSDK.lib.Account.fromSeed('33'.repeat(32), 0);
    const externalKeyPair = seedAccount._getPrivateKey();
    if (!externalKeyPair) throw new Error('expected private key in seed account');
    const lookup = vi.fn(async () => externalKeyPair);
    const signer = new GcpKmsSigner(
      {
        key: 'projects/project-a/locations/global/keyRings/ring-a/cryptoKeys/keeta-signer',
        network: 'test',
      },
      {
        loadKms: async () => ({ KeyManagementServiceClient: class MockKmsClient {} }),
        loadFactory: async () => ({ KeetaGCPKMSKeyPairFactory: () => ({ lookup }) }),
      }
    );

    const [accountA, accountB, publicKey] = await Promise.all([
      signer.getAccount(),
      signer.getAccount(),
      signer.getPublicKey(),
    ]);

    expect(accountA.publicKeyString.get()).toBe(seedAccount.publicKeyString.get());
    expect(accountB.publicKeyString.get()).toBe(seedAccount.publicKeyString.get());
    expect(publicKey).toBe(seedAccount.publicKeyString.get());
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported key algorithms with a clear error', () => {
    expect(
      () =>
        new GcpKmsSigner({
          key: 'projects/project-a/locations/global/keyRings/ring-a/cryptoKeys/keeta-signer',
          network: 'test',
          keyType: KeetaSDK.lib.Account.AccountKeyAlgorithm.ED25519 as never,
        })
    ).toThrow(/supports only SECP256K1 and SECP256R1/);
  });
});
