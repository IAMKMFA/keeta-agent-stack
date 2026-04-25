import { describe, expect, it } from 'vitest';
import {
  getBuiltinRailMetadata,
  listBuiltinRailMetadata,
  listBuiltinRailMetadataDetailed,
  listBuiltinRailsByTransport,
  mergeRailMetadata,
} from './metadata.js';

describe('rail metadata catalog', () => {
  it('exposes the expected production rails mirroring @keetanetwork/anchor', () => {
    const rails = listBuiltinRailMetadata().map((r) => r.id);
    for (const required of [
      'keeta-transfer',
      'anchor-ach-debit',
      'anchor-ach-push',
      'anchor-wire',
      'anchor-wire-intl',
      'anchor-sepa-push',
      'anchor-pix-push',
      'anchor-upi-push',
      'anchor-evm-send',
      'anchor-solana-send',
      'anchor-bitcoin-send',
      'anchor-tron-send',
      'anchor-fps-push',
      'anchor-hk-fps-push',
      'anchor-paynow-push',
      'anchor-duitnow-push',
      'anchor-interac-push',
      'anchor-spei-push',
      'anchor-card-pull',
    ]) {
      expect(rails, `catalog must include ${required}`).toContain(required);
    }
  });

  it('tags each builtin rail with a transport category', () => {
    for (const rail of listBuiltinRailMetadataDetailed()) {
      expect(['fiat-push', 'fiat-pull', 'crypto', 'native']).toContain(rail.transport);
    }
  });

  it('returns lookup-by-id entries with transport+production metadata', () => {
    const ach = getBuiltinRailMetadata('anchor-ach-debit');
    expect(ach).toMatchObject({
      id: 'anchor-ach-debit',
      transport: 'fiat-pull',
      production: true,
      supportsManagedTransfer: true,
    });
  });

  it('filters by transport and production-only', () => {
    const fiatPush = listBuiltinRailsByTransport({ transports: ['fiat-push'] });
    expect(fiatPush.length).toBeGreaterThan(5);
    expect(fiatPush.every((r) => r.transport === 'fiat-push')).toBe(true);

    const productionCrypto = listBuiltinRailsByTransport({
      transports: ['crypto'],
      productionOnly: true,
    });
    expect(productionCrypto.every((r) => r.production && r.transport === 'crypto')).toBe(true);
    expect(productionCrypto.some((r) => r.id === 'anchor-evm-send')).toBe(true);
  });

  it('mergeRailMetadata preserves transport and managed-transfer info for known adapters', () => {
    const merged = mergeRailMetadata([{ id: 'keeta-transfer', kind: 'transfer' }]);
    expect(merged[0]).toMatchObject({
      id: 'keeta-transfer',
      transport: 'native',
      supportsManagedTransfer: true,
    });
  });

  it('mergeRailMetadata falls back cleanly for unknown adapters', () => {
    const merged = mergeRailMetadata([{ id: 'unknown-rail', kind: 'anchor' }]);
    expect(merged[0]).toEqual({
      id: 'unknown-rail',
      name: 'unknown-rail',
      production: true,
      kind: 'anchor',
    });
  });
});
