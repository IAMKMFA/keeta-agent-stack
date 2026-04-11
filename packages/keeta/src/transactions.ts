import type { UserClient } from '@keetanetwork/keetanet-client';
import type { Signer } from '@keeta-agent-sdk/wallet';
import { KeetaConnectionError, isKeetaErrorRetryable } from './errors.js';

export interface UnsignedTransfer {
  to: string;
  assetId: string;
  amount: string;
  memo?: string;
}

export type SettlementState = 'submitted' | 'confirmed' | 'failed' | 'unknown';

export interface KeetaPublishReceipt {
  /** Primary block hash from the published vote staple (string form) */
  blockHash: string;
  /** Whether the client believes the staple was published */
  published: boolean;
  /** Raw publish path (direct vs publish-aid) */
  publishSource?: string;
  /** Vote staple JSON-safe snapshot for audit */
  raw: Record<string, unknown>;
}

function blockHashToString(h: unknown): string {
  if (h && typeof h === 'object' && 'toString' in h && typeof (h as { toString: () => string }).toString === 'function') {
    return (h as { toString: () => string }).toString();
  }
  return String(h);
}

/**
 * Extract a stable primary hash and JSON-safe receipt from `UserClient.send` / `publishBuilder` results.
 * Handles both direct `voteStaple` responses and publish-aid `blocks` responses.
 */
export function receiptFromPublishResult(result: {
  voteStaple?: { blocks?: unknown[]; toJSON?: () => unknown };
  blocks?: unknown[];
  publish: boolean;
  from?: string;
}): KeetaPublishReceipt {
  const vs = result.voteStaple;
  const blocks = (vs?.blocks ?? result.blocks ?? []) as { hash?: unknown }[];
  const first = blocks[0];
  const blockHash = first?.hash !== undefined ? blockHashToString(first.hash) : 'unknown';
  let raw: Record<string, unknown>;
  try {
    const j = vs?.toJSON?.() ?? vs ?? { blocks: result.blocks };
    raw = JSON.parse(JSON.stringify(j)) as Record<string, unknown>;
  } catch {
    raw = { publish: result.publish, from: result.from, blockHash };
  }
  return {
    blockHash,
    published: result.publish,
    publishSource: result.from,
    raw,
  };
}

export type SendTransferParams = UnsignedTransfer;

/**
 * Native token transfer via Keeta `UserClient.send` (uses SDK signing; not the generic `Signer` interface).
 * Call only from worker-side code with a `UserClient` constructed from `Account.fromSeed`.
 */
export async function sendTransferWithUserClient(
  userClient: UserClient,
  params: SendTransferParams
): Promise<KeetaPublishReceipt> {
  const amount = BigInt(params.amount);
  const token = params.assetId;
  const external = params.memo;
  try {
    const result = await userClient.send(params.to, amount, token, external);
    return receiptFromPublishResult(result as Parameters<typeof receiptFromPublishResult>[0]);
  } catch (e) {
    const retryable = isKeetaErrorRetryable(e);
    throw new KeetaConnectionError(`UserClient.send failed to ${params.to}`, e, retryable);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bounded retry on transient Keeta failures (`KeetaConnectionError.retryable`).
 */
export async function sendTransferWithUserClientWithRetry(
  userClient: UserClient,
  params: SendTransferParams,
  opts?: { maxAttempts?: number; baseDelayMs?: number }
): Promise<KeetaPublishReceipt> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const baseDelayMs = opts?.baseDelayMs ?? 250;
  let last: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await sendTransferWithUserClient(userClient, params);
    } catch (e) {
      last = e;
      const retry =
        e instanceof KeetaConnectionError
          ? e.retryable
          : isKeetaErrorRetryable(e);
      if (!retry || i === maxAttempts - 1) throw e;
      await sleep(baseDelayMs * 2 ** i);
    }
  }
  throw last;
}

/**
 * Legacy placeholder: constructing unsigned block bytes for external signing is not used on the
 * current Keeta path (`UserClient.send` signs internally). Kept for adapter contract tests that
 * expect a byte array shape.
 */
export async function buildTransferTx(tx: UnsignedTransfer): Promise<Uint8Array> {
  void tx;
  return new Uint8Array([0]);
}

export async function submitTx(_signed: Uint8Array): Promise<{ txId: string }> {
  void _signed;
  throw new Error('submitTx is not used for Keeta — use sendTransferWithUserClient from the worker');
}

/**
 * Not supported for Keeta native transfers: the SDK signs via `Account`, not arbitrary payloads.
 * Use {@link sendTransferWithUserClient} in the worker instead.
 */
export async function signAndSubmit(_tx: UnsignedTransfer, _signer: Signer): Promise<{ txId: string }> {
  void _tx;
  void _signer;
  throw new Error(
    'signAndSubmit is not supported for Keeta native transfers — use UserClient.send via sendTransferWithUserClient in the worker'
  );
}

export function inferSettlementState(published: boolean): SettlementState {
  if (published) return 'confirmed';
  return 'submitted';
}
