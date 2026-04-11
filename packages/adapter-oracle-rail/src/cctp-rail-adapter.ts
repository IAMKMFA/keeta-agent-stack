import type { VenueAdapter } from '@keeta-agent-sdk/adapter-base';
import { err, ok } from '@keeta-agent-sdk/adapter-base';
import type { ExecuteContext } from '@keeta-agent-sdk/adapter-base';
import { KtaOracleClient } from '@keeta-agent-sdk/keeta';
import type { AdapterHealth, CapabilityMap, QuoteRequest } from '@keeta-agent-sdk/types';
import { randomUUID } from 'node:crypto';

const DEFAULT_ID = 'oracle-rail-cctp-usdc';

/**
 * Second production-shaped rail: USDC movement via CCTP (e.g. Base anchor), planned with KTA-Oracle.
 * Simulate path is always available; live path requires ORACLE_RAIL_CCTP_LIVE_URL or metadata.oracleRailCctpLiveUrl.
 */
export class OracleCctpRailAdapter implements VenueAdapter {
  readonly id: string;
  readonly kind = 'anchor' as const;
  private readonly oracle: KtaOracleClient;

  constructor(opts?: { id?: string; oracle?: KtaOracleClient }) {
    this.id = opts?.id ?? DEFAULT_ID;
    this.oracle =
      opts?.oracle ??
      new KtaOracleClient({
        baseUrl: process.env.KTA_ORACLE_BASE_URL,
        timeoutMs: Number(process.env.KTA_ORACLE_TIMEOUT_MS ?? 10_000),
      });
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      await this.oracle.getStatus();
      return {
        adapterId: this.id,
        ok: true,
        checkedAt: new Date().toISOString(),
        latencyMs: 0,
      };
    } catch (e) {
      return {
        adapterId: this.id,
        ok: false,
        checkedAt: new Date().toISOString(),
        message: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async getCapabilities(): Promise<CapabilityMap> {
    return {
      adapterId: this.id,
      kind: 'anchor',
      pairs: [{ base: 'USDC', quote: 'USDC' }],
      features: ['bridge', 'cctp', 'oracle_rail'],
    };
  }

  supportsPair(baseAsset: string, quoteAsset: string): boolean {
    return baseAsset === 'USDC' && quoteAsset === 'USDC';
  }

  async getQuote(request: QuoteRequest) {
    if (!this.supportsPair(request.baseAsset, request.quoteAsset)) {
      return err('UNSUPPORTED_PAIR', 'CCTP oracle rail only supports USDC/USDC same-asset bridge');
    }
    let oracleRaw: unknown;
    try {
      const size = Number(request.size);
      oracleRaw = await this.oracle.comparePaymentRails({
        from: 'all',
        amount: Number.isFinite(size) ? size : undefined,
        currency: 'USD',
      });
    } catch {
      oracleRaw = { unavailable: true };
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
      expectedSlippageBps: 5,
      validUntil: new Date(Date.now() + 300_000).toISOString(),
      raw: { oracleRail: true, cctp: true, oracleCompare: oracleRaw },
    });
  }

  async execute(context: ExecuteContext) {
    const meta = context.intentMetadata ?? {};
    const liveUrl =
      (typeof meta.oracleRailCctpLiveUrl === 'string' && meta.oracleRailCctpLiveUrl.length > 0
        ? meta.oracleRailCctpLiveUrl
        : undefined) ??
      (typeof process.env.ORACLE_RAIL_CCTP_LIVE_URL === 'string'
        ? process.env.ORACLE_RAIL_CCTP_LIVE_URL
        : undefined);

    if (context.mode === 'simulate') {
      const railRef = `cctp_sim_${randomUUID().slice(0, 8)}`;
      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: 'confirmed' as const,
        settlementState: 'confirmed' as const,
        completedAt: new Date().toISOString(),
        normalizedReceipt: {
          railKind: 'cctp_usdc' as const,
          network: 'base',
          settlementState: 'confirmed' as const,
          adapterId: this.id,
          railRef,
        },
        raw: { oracleRail: true, mode: 'simulate', cctp: true },
      });
    }

    if (!liveUrl) {
      return err(
        'ORACLE_RAIL_LIVE_NOT_CONFIGURED',
        'Set ORACLE_RAIL_CCTP_LIVE_URL or intent.metadata.oracleRailCctpLiveUrl for live CCTP rail execution'
      );
    }

    try {
      const res = await fetch(liveUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intentId: context.intentId,
          walletId: context.walletId,
          step: context.step,
          metadata: meta,
        }),
      });
      const body = (await res.json()) as {
        txRef?: string;
        railRef?: string;
        settlementState?: 'submitted' | 'confirmed' | 'failed';
      };
      if (!res.ok) {
        return err('ORACLE_RAIL_HTTP', `Partner rail returned ${res.status}`);
      }
      const railRef = body.railRef ?? body.txRef ?? `cctp_${randomUUID().slice(0, 8)}`;
      const settlementState: 'submitted' | 'confirmed' | 'failed' =
        body.settlementState === 'confirmed' || body.settlementState === 'failed'
          ? body.settlementState
          : 'submitted';
      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: settlementState === 'failed' ? ('failed' as const) : ('submitted' as const),
        settlementState,
        txId: body.txRef,
        completedAt: new Date().toISOString(),
        normalizedReceipt: {
          railKind: 'cctp_usdc' as const,
          network: 'base',
          settlementState,
          adapterId: this.id,
          railRef,
          rawRef: railRef,
        },
        raw: { oracleRail: true, cctp: true, partner: body },
      });
    } catch (e) {
      return err('ORACLE_RAIL_FETCH_FAILED', e instanceof Error ? e.message : String(e));
    }
  }
}
