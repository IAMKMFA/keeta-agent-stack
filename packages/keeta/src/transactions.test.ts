import { describe, expect, it } from 'vitest';
import { inferSettlementState, receiptFromPublishResult } from './transactions.js';

describe('receiptFromPublishResult', () => {
  it('extracts hash from voteStaple.blocks', () => {
    const r = receiptFromPublishResult({
      voteStaple: {
        blocks: [{ hash: { toString: () => 'blockhash1' } }],
        toJSON: () => ({ blocks: ['blockhash1'] }),
      },
      publish: true,
      from: 'direct',
    });
    expect(r.blockHash).toBe('blockhash1');
    expect(r.published).toBe(true);
  });

  it('falls back to top-level blocks (publish-aid shape)', () => {
    const r = receiptFromPublishResult({
      blocks: [{ hash: { toString: () => 'aid1' } }],
      publish: false,
      from: 'publish-aid',
    });
    expect(r.blockHash).toBe('aid1');
    expect(r.published).toBe(false);
  });
});

describe('inferSettlementState', () => {
  it('maps publish flag', () => {
    expect(inferSettlementState(true)).toBe('confirmed');
    expect(inferSettlementState(false)).toBe('submitted');
  });
});
