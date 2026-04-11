import type { VenueAdapter } from '@keeta-agent-sdk/adapter-base';
import { err, ok } from '@keeta-agent-sdk/adapter-base';
import type { ExecuteContext } from '@keeta-agent-sdk/adapter-base';
import {
  KEETA_USER_CLIENT_EXTENSION,
  inferSettlementState,
  readChainHealth,
  sendTransferWithUserClientWithRetry,
  type KeetaNetworkName,
  type UserClient,
} from '@keeta-agent-sdk/keeta';
import type { AdapterHealth, CapabilityMap, QuoteRequest } from '@keeta-agent-sdk/types';
import { randomUUID } from 'node:crypto';

const EXPLORER_TEMPLATE_KEY = 'keetaExplorerTxUrlTemplate';

function parseAtomicAmount(stepSizeIn: string, metadata: Record<string, unknown> | undefined): bigint {
  const m = metadata?.amountAtomic;
  if (typeof m === 'string' && /^[0-9]+$/.test(m)) {
    return BigInt(m);
  }
  const base = stepSizeIn.split('.')[0] ?? '0';
  if (!/^[0-9]+$/.test(base)) {
    throw new Error(`Invalid amount for Keeta transfer: ${stepSizeIn}`);
  }
  return BigInt(base);
}

export class KeetaTransferAdapter implements VenueAdapter {
  readonly id: string;
  readonly kind = 'transfer' as const;
  private readonly network: KeetaNetworkName;

  constructor(id = 'keeta-transfer', network?: KeetaNetworkName) {
    this.id = id;
    const n = network ?? (process.env.KEETA_NETWORK as KeetaNetworkName | undefined) ?? 'test';
    this.network = n;
  }

  async healthCheck(): Promise<AdapterHealth> {
    const snap = await readChainHealth(this.network);
    return {
      adapterId: this.id,
      ok: snap.ok,
      checkedAt: snap.measuredAt,
      latencyMs: snap.latencyMs,
      message: snap.ok ? undefined : snap.errorMessage,
    };
  }

  async getCapabilities(): Promise<CapabilityMap> {
    return {
      adapterId: this.id,
      kind: 'transfer',
      pairs: [{ base: 'KTA', quote: 'KTA' }],
      features: ['transfer'],
    };
  }

  supportsPair(baseAsset: string, quoteAsset: string): boolean {
    return baseAsset === quoteAsset && baseAsset === 'KTA';
  }

  async getQuote(request: QuoteRequest) {
    if (!this.supportsPair(request.baseAsset, request.quoteAsset)) {
      return err('UNSUPPORTED_PAIR', 'Keeta transfer only supports same-asset KTA transfers');
    }
    return ok({
      adapterId: this.id,
      baseAsset: request.baseAsset,
      quoteAsset: request.quoteAsset,
      side: request.side,
      sizeIn: request.size,
      sizeOut: request.size,
      price: '1',
      feeBps: 0,
      expectedSlippageBps: 0,
      raw: { keeta: true },
    });
  }

  async execute(context: ExecuteContext) {
    if (context.mode === 'simulate') {
      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: 'confirmed' as const,
        settlementState: 'confirmed' as const,
        completedAt: new Date().toISOString(),
        normalizedReceipt: {
          railKind: 'native_kt' as const,
          network: this.network,
          settlementState: 'confirmed' as const,
          adapterId: this.id,
        },
        raw: { simulated: true },
      });
    }

    const step = context.step;
    if (!step) {
      return err('MISSING_STEP', 'Keeta transfer requires a route step');
    }

    const userClient = context.extensions?.[KEETA_USER_CLIENT_EXTENSION] as UserClient | undefined;
    if (!userClient) {
      return err(
        'KEETA_USER_CLIENT_MISSING',
        'Live Keeta transfer requires a signing UserClient injected by the worker (KEETA_SIGNING_SEED)'
      );
    }

    const meta = context.intentMetadata ?? {};
    const transferTo = typeof meta.transferTo === 'string' ? meta.transferTo : undefined;
    if (!transferTo) {
      return err('MISSING_TRANSFER_TO', 'Set intent.metadata.transferTo to a Keeta account address');
    }

    let amount: bigint;
    try {
      amount = parseAtomicAmount(step.sizeIn, meta);
    } catch (e) {
      return err('INVALID_AMOUNT', e instanceof Error ? e.message : 'Invalid amount');
    }

    const token = String(userClient.baseToken);

    const explorerTemplate =
      typeof context.extensions?.[EXPLORER_TEMPLATE_KEY] === 'string'
        ? (context.extensions[EXPLORER_TEMPLATE_KEY] as string)
        : undefined;

    try {
      const receipt = await sendTransferWithUserClientWithRetry(userClient, {
        to: transferTo,
        assetId: token,
        amount: amount.toString(),
        memo: typeof meta.memo === 'string' ? meta.memo : undefined,
      });
      const settlementState = inferSettlementState(receipt.published);
      const blockHash = receipt.blockHash;
      const explorerUrl =
        explorerTemplate && blockHash !== 'unknown'
          ? explorerTemplate.replaceAll('{hash}', blockHash)
          : undefined;

      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: settlementState === 'confirmed' ? ('confirmed' as const) : ('submitted' as const),
        txId: blockHash,
        blockHash,
        settlementState,
        explorerUrl,
        completedAt: new Date().toISOString(),
        normalizedReceipt: {
          railKind: 'native_kt' as const,
          network: this.network,
          settlementState: settlementState as 'submitted' | 'confirmed' | 'failed' | 'unknown',
          adapterId: this.id,
          blockHash,
          txHash: blockHash,
        },
        raw: { keeta: true, receipt },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return err('KEETA_SEND_FAILED', msg);
    }
  }
}
