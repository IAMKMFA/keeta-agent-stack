import type * as KeetaSDK from '@keetanetwork/keetanet-client';

export type KeetaSigningAccount = InstanceType<typeof KeetaSDK.lib.Account>;

export interface SignerProvider {
  readonly kind: 'seed' | 'gcp-kms';
  getAccount(): Promise<KeetaSigningAccount>;
  getPublicKey(): Promise<string>;
}
