import { describe, expect, it } from 'vitest';
import { createKeetaWallet } from './wallet.js';

describe('createKeetaWallet', () => {
  it('creates seed and address with defaults', () => {
    const wallet = createKeetaWallet();
    expect(wallet.seed.length).toBeGreaterThan(0);
    expect(wallet.address.startsWith('keeta_')).toBe(true);
    expect(wallet.index).toBe(0);
    expect(wallet.algorithm).toBe('SECP256K1');
  });

  it('supports custom index and algorithm', () => {
    const wallet = createKeetaWallet({ index: 2, algorithm: 'ED25519' });
    expect(wallet.address.startsWith('keeta_')).toBe(true);
    expect(wallet.index).toBe(2);
    expect(wallet.algorithm).toBe('ED25519');
  });

  it('rejects invalid derivation indexes', () => {
    expect(() => createKeetaWallet({ index: -1 })).toThrow(/non-negative integer/);
    expect(() => createKeetaWallet({ index: 1.5 })).toThrow(/non-negative integer/);
  });
});
