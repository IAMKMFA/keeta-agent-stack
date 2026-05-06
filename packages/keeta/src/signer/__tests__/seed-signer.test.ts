import * as KeetaSDK from '@keetanetwork/keetanet-client';
import { describe, expect, it } from 'vitest';
import { SeedSigner } from '../seed-signer.js';

describe('SeedSigner', () => {
  it('produces the same account and public key as the existing seed path', async () => {
    const seed = '22'.repeat(32);
    const accountIndex = 3;
    const signer = new SeedSigner({ seed, network: 'test', accountIndex });

    const account = await signer.getAccount();
    const oldPathAccount = KeetaSDK.lib.Account.fromSeed(seed, accountIndex);

    expect(account.publicKeyString.get()).toBe(oldPathAccount.publicKeyString.get());
    expect(await signer.getPublicKey()).toBe(oldPathAccount.publicKeyString.get());
    expect(signer.kind).toBe('seed');
  });
});
