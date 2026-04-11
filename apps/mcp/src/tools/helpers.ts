import * as KeetaNet from '@keetanetwork/keetanet-client';
import * as KeetaAnchor from '@keetanetwork/anchor';
import * as TokenMetadata from '@keetanetwork/anchor/lib/token-metadata.js';
import * as Asset from '@keetanetwork/anchor/lib/asset.js';
import type { Networks } from '@keetanetwork/keetanet-client/config/index.js';
import type { JSONSerializable } from '@keetanetwork/keetanet-client/lib/utils/conversion.js';

export type NetworkAlias = Networks;
type UnknownRecord = Record<string, unknown>;
type DynamicMethod = (...args: unknown[]) => unknown;
type Constructable = new (...args: unknown[]) => unknown;
type GetterLike = { get: () => unknown };
type PropertyTarget = object | DynamicMethod | Constructable;
type AccountKeyAlgorithm =
  (typeof KeetaNet.lib.Account.AccountKeyAlgorithm)[keyof typeof KeetaNet.lib.Account.AccountKeyAlgorithm];
type UserClientTools = {
  client: {
    getBalance: (address: string, token: unknown) => Promise<unknown>;
  };
  baseToken: unknown;
  networkAddress: unknown;
  initBuilder: () => unknown;
};

function isObjectLike(value: unknown): value is PropertyTarget {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

export const DPO: (input: unknown) => JSONSerializable = KeetaNet.lib.Utils.Helper.debugPrintableObject.bind(
  KeetaNet.lib.Utils.Helper
);

const VALID_NETWORKS = ['main', 'test'] as const;

export function validateNetwork(network: string): NetworkAlias {
  if (!VALID_NETWORKS.includes(network as (typeof VALID_NETWORKS)[number])) {
    throw new Error(`Invalid network "${network}". Must be one of: ${VALID_NETWORKS.join(', ')}`);
  }
  return network as NetworkAlias;
}

export function createClient(network: NetworkAlias) {
  return KeetaNet.Client.fromNetwork(network);
}

export function createUserClient(network: NetworkAlias, account: unknown) {
  return KeetaNet.UserClient.fromNetwork(network, account as Parameters<typeof KeetaNet.UserClient.fromNetwork>[1]);
}

export function accountFromSeed(seed: string, index: number, algorithm?: string) {
  const algo = resolveKeyAlgorithm(algorithm);
  return KeetaNet.lib.Account.fromSeed(seed, index, algo);
}

export function accountFromPublicKey(publicKey: string) {
  return KeetaNet.lib.Account.fromPublicKeyString(publicKey);
}

export function generateSeed(): string {
  return KeetaNet.lib.Account.generateRandomSeed({
    asString: true,
  }) as string;
}

export function resolveKeyAlgorithm(algorithm?: string): AccountKeyAlgorithm {
  if (!algorithm) return KeetaNet.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256K1;
  const mapping: Record<string, AccountKeyAlgorithm> = {
    ECDSA_SECP256K1: KeetaNet.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256K1,
    SECP256K1: KeetaNet.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256K1,
    ECDSA_SECP256R1: KeetaNet.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256R1,
    SECP256R1: KeetaNet.lib.Account.AccountKeyAlgorithm.ECDSA_SECP256R1,
    ED25519: KeetaNet.lib.Account.AccountKeyAlgorithm.ED25519,
    TOKEN: KeetaNet.lib.Account.AccountKeyAlgorithm.TOKEN,
    STORAGE: KeetaNet.lib.Account.AccountKeyAlgorithm.STORAGE,
    MULTISIG: KeetaNet.lib.Account.AccountKeyAlgorithm.MULTISIG,
  };
  const upper = algorithm.toUpperCase();
  const resolved = mapping[upper];
  if (resolved === undefined) {
    throw new Error(`Unknown key algorithm "${algorithm}". Valid: ${Object.keys(mapping).join(', ')}`);
  }
  return resolved;
}

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

export function getProperty(target: unknown, name: string): unknown {
  if (!isObjectLike(target)) return undefined;
  return Reflect.get(target, name);
}

export function getMethod(target: unknown, name: string): DynamicMethod | undefined {
  const value = getProperty(target, name);
  return typeof value === 'function' ? (value as DynamicMethod) : undefined;
}

export function getRequiredMethod(target: unknown, name: string, owner: string): DynamicMethod {
  const method = getMethod(target, name);
  if (!method) {
    throw new Error(`"${name}" is not a method on ${owner}.`);
  }
  return method;
}

export function getOwnMethodNames(target: PropertyTarget): string[] {
  return Object.getOwnPropertyNames(target).filter((name) => typeof getProperty(target, name) === 'function');
}

export function getPrototypeMethodNames(target: unknown): string[] {
  if (typeof target !== 'function' && !isRecord(target)) return [];
  const prototype = Object.getPrototypeOf(target);
  if (!isRecord(prototype)) return [];
  return Object.getOwnPropertyNames(prototype).filter((name) => name !== 'constructor');
}

export function isConstructable(value: unknown): value is Constructable {
  return typeof value === 'function';
}

export function isGetterLike(value: unknown): value is GetterLike {
  return isRecord(value) && typeof value.get === 'function';
}

export function getGetterValue(value: unknown): unknown {
  if (!isGetterLike(value)) return value;
  return value.get();
}

export function getPublicKeyString(value: unknown): string {
  const publicKeyString = getProperty(value, 'publicKeyString');
  if (!isGetterLike(publicKeyString)) {
    throw new Error('Expected a publicKeyString getter on Keeta SDK value.');
  }
  return String(publicKeyString.get());
}

export function getUserClientTools(client: unknown): UserClientTools {
  const getBalanceOwner = getProperty(client, 'client');
  const getBalance = getMethod(getBalanceOwner, 'getBalance');
  const initBuilder = getMethod(client, 'initBuilder');
  const baseToken = getProperty(client, 'baseToken');
  const networkAddress = getProperty(client, 'networkAddress');

  if (!getBalance || !initBuilder || baseToken === undefined || networkAddress === undefined) {
    throw new Error('Keeta UserClient is missing expected helper methods.');
  }

  return {
    client: {
      getBalance: async (address: string, token: unknown) => getBalance.call(getBalanceOwner, address, token),
    },
    baseToken,
    networkAddress,
    initBuilder: () => initBuilder.call(client),
  };
}

export async function destroyIfPossible(target: unknown): Promise<void> {
  const destroy = getMethod(target, 'destroy');
  if (destroy) {
    await destroy.call(target);
  }
}

export function resolveArg(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'boolean' || typeof value === 'number') return value;

  if (typeof value === 'string') {
    if (value.startsWith('keeta_')) return accountFromPublicKey(value);
    if (value.startsWith('ALGO:')) return resolveKeyAlgorithm(value.slice(5));
    if (value.startsWith('PERM:')) {
      const flags = value.slice(5).split(',');
      return new KeetaNet.lib.Permissions(flags as ConstructorParameters<typeof KeetaNet.lib.Permissions>[0]);
    }
    if (value.startsWith('BIGINT:')) return BigInt(value.slice(7));
    if (value.startsWith('BUFFER_B64:')) return Buffer.from(value.slice(11), 'base64');
    if (value.startsWith('ADJUST:')) {
      const method = value.slice(7).toUpperCase();
      return (KeetaNet.lib.Block.AdjustMethod as UnknownRecord)[method];
    }
    if (value.startsWith('OP:')) {
      const op = value.slice(3).toUpperCase();
      return (KeetaNet.lib.Block.OperationType as UnknownRecord)[op];
    }
    return value;
  }

  if (Array.isArray(value)) return value.map(resolveArg);

  if (typeof value === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      resolved[key] = resolveArg(entry);
    }
    return resolved;
  }

  return value;
}

export function resolveArgs(args: unknown[]): unknown[] {
  return args.map(resolveArg);
}

export function listMethods(obj: unknown): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const methods = new Set<string>();
  let current = obj;
  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (name !== 'constructor' && typeof getProperty(obj, name) === 'function') {
        methods.add(name);
      }
    }
    current = Object.getPrototypeOf(current);
  }
  return [...methods].sort();
}

export function listProperties(obj: unknown): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const props = new Set<string>();
  let current = obj;
  while (current && current !== Object.prototype) {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (name !== 'constructor' && typeof getProperty(obj, name) !== 'function') {
        props.add(name);
      }
    }
    current = Object.getPrototypeOf(current);
  }
  return [...props].sort();
}

export function safeSerialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'symbol') return value.toString();
  if (Buffer.isBuffer(value)) return value.toString('base64');

  if (isRecord(value) && typeof value.toJSON === 'function') {
    return safeSerialize(value.toJSON());
  }
  if (isGetterLike(value)) {
    try {
      return value.get();
    } catch {
      return '[Unserializable Getter]';
    }
  }
  try {
    return DPO(value);
  } catch {
    // noop
  }
  if (Array.isArray(value)) return value.map(safeSerialize);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = safeSerialize(entry);
    }
    return out;
  }
  return value;
}

export function formatResult(data: unknown): string {
  return JSON.stringify(safeSerialize(data), null, 2);
}

export function discoverAnchorServices(): Record<string, unknown> {
  const services: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(KeetaAnchor)) {
    if (key === 'lib' || key === 'KeetaNet' || key === 'default' || typeof value !== 'object' || value === null) continue;
    const clientCtor = getProperty(value, 'Client');
    if (isConstructable(clientCtor)) {
      services[key] = clientCtor;
    }
  }
  return services;
}

export function discoverAnchorLibModules(): Record<string, unknown> {
  const modules: Record<string, unknown> = {};
  if (KeetaAnchor.lib && typeof KeetaAnchor.lib === 'object') {
    for (const [key, value] of Object.entries(KeetaAnchor.lib)) {
      if (key === 'default') continue;
      modules[key] = value;
    }
  }
  modules.TokenMetadata = TokenMetadata;
  modules.Asset = Asset;
  return modules;
}

export function createAnchorServiceClient(serviceName: string, userClient: unknown, config: Record<string, unknown> = {}): unknown {
  const services = discoverAnchorServices();
  const ClientClass = services[serviceName];
  if (!isConstructable(ClientClass)) {
    throw new Error(
      `Unknown anchor service "${serviceName}". Available services: ${Object.keys(services).join(', ')}.`
    );
  }
  return new ClientClass(userClient, config);
}

export function getAnchorLibModule(moduleName: string): unknown {
  const modules = discoverAnchorLibModules();
  const mod = modules[moduleName];
  if (!mod) {
    throw new Error(
      `Unknown anchor lib module "${moduleName}". Available modules: ${Object.keys(modules).join(', ')}.`
    );
  }
  return mod;
}

export { KeetaNet, KeetaAnchor };
