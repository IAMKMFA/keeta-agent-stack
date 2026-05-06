import { createRequire } from 'node:module';
import * as crypto from 'node:crypto';
import * as KeetaSDK from '@keetanetwork/keetanet-client';
import type { KeetaNetworkName } from '../network-types.js';
import type { KeetaSigningAccount, SignerProvider } from './types.js';

export interface GcpKmsKeyConfig {
  projectId: string;
  locationId: string;
  keyRingId: string;
  keyId: string;
  versionId?: string;
}

export type AccountKeyAlgorithm =
  | typeof KeetaSDK.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256K1
  | typeof KeetaSDK.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256R1;

export interface GcpKmsSignerOptions {
  key: string | GcpKmsKeyConfig;
  keyType?: AccountKeyAlgorithm;
  network: KeetaNetworkName;
}

interface KmsModule {
  KeyManagementServiceClient: unknown;
}

interface GcpKmsKeyPair {
  readonly keyName?: string;
  readonly keyType?: number;
}

interface GcpKmsKeyPairClass {
  lookup(options: { key: string; keyType?: AccountKeyAlgorithm }): Promise<GcpKmsKeyPair>;
}

type KeetaGCPKMSKeyPairFactory = (packages: {
  KeyManagementServiceClient: unknown;
  KeetaNet: {
    lib: {
      Account: typeof KeetaSDK.lib.Account;
      Utils: {
        Helper: typeof KeetaSDK.lib.Utils.Helper;
        Buffer: typeof KeetaSDK.lib.Utils.Buffer;
        ASN1: typeof KeetaSDK.lib.Utils.ASN1;
      };
    };
  };
  crypto: Pick<typeof crypto, 'createPublicKey'>;
}) => GcpKmsKeyPairClass;

interface GcpKmsFactoryModule {
  KeetaGCPKMSKeyPairFactory: KeetaGCPKMSKeyPairFactory;
}

export interface GcpKmsSignerLoaders {
  loadKms?: () => Promise<KmsModule>;
  loadFactory?: () => Promise<GcpKmsFactoryModule>;
}

const require = createRequire(import.meta.url);

function resolveGcpKmsKeyName(key: string | GcpKmsKeyConfig): string {
  if (typeof key === 'string') return key;
  const base = `projects/${key.projectId}/locations/${key.locationId}/keyRings/${key.keyRingId}/cryptoKeys/${key.keyId}`;
  return key.versionId ? `${base}/cryptoKeyVersions/${key.versionId}` : base;
}

function assertSupportedKmsKeyType(keyType: AccountKeyAlgorithm | number | undefined): void {
  if (keyType === undefined) return;
  const supported = [
    KeetaSDK.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256K1,
    KeetaSDK.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256R1,
  ];
  if (!supported.includes(keyType as AccountKeyAlgorithm)) {
    throw new Error(
      `GcpKmsSigner supports only SECP256K1 and SECP256R1 Keeta account keys; received keyType "${keyType}"`
    );
  }
}

async function loadGoogleKms(): Promise<KmsModule> {
  const moduleName = '@google-cloud/kms';
  try {
    return (await import(moduleName)) as KmsModule;
  } catch (error) {
    throw new Error(
      'KEETA_KMS_PROVIDER=gcp requires optional peer dependency "@google-cloud/kms". Install it in the worker runtime and configure GOOGLE_APPLICATION_CREDENTIALS.',
      { cause: error }
    );
  }
}

async function loadKeetaGcpKmsFactory(): Promise<GcpKmsFactoryModule> {
  return require('@keetanetwork/keetanet-client/lib/utils/external-keys/gcp-kms.js') as GcpKmsFactoryModule;
}

export class GcpKmsSigner implements SignerProvider {
  readonly kind = 'gcp-kms' as const;
  readonly network: KeetaNetworkName;
  private readonly keyName: string;
  private readonly keyType: AccountKeyAlgorithm | undefined;
  private readonly loaders: Required<GcpKmsSignerLoaders>;
  private account: KeetaSigningAccount | undefined;
  private accountPromise: Promise<KeetaSigningAccount> | undefined;

  constructor(options: GcpKmsSignerOptions, loaders: GcpKmsSignerLoaders = {}) {
    assertSupportedKmsKeyType(options.keyType);
    this.network = options.network;
    this.keyName = resolveGcpKmsKeyName(options.key);
    this.keyType = options.keyType;
    this.loaders = {
      loadKms: loaders.loadKms ?? loadGoogleKms,
      loadFactory: loaders.loadFactory ?? loadKeetaGcpKmsFactory,
    };
  }

  async getAccount(): Promise<KeetaSigningAccount> {
    if (this.account) return this.account;
    if (this.accountPromise) return this.accountPromise;

    this.accountPromise = (async () => {
      const [{ KeyManagementServiceClient }, { KeetaGCPKMSKeyPairFactory }] = await Promise.all([
        this.loaders.loadKms(),
        this.loaders.loadFactory(),
      ]);
      const keyPairClass = KeetaGCPKMSKeyPairFactory({
        KeyManagementServiceClient,
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
        crypto: { createPublicKey: crypto.createPublicKey },
      });
      const keyPair = await keyPairClass.lookup({
        key: this.keyName,
        ...(this.keyType === undefined ? {} : { keyType: this.keyType }),
      });
      assertSupportedKmsKeyType(keyPair.keyType);
      this.account = new KeetaSDK.lib.Account(keyPair as never) as KeetaSigningAccount;
      return this.account;
    })();
    return this.accountPromise;
  }

  async getPublicKey(): Promise<string> {
    const account = await this.getAccount();
    return account.publicKeyString.get();
  }
}
