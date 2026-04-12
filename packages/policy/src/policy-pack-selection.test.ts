import { describe, expect, it } from 'vitest';
import { resolvePolicyPackSelection } from './policy-pack-selection.js';

const pack = {
  id: '550e8400-e29b-41d4-a716-446655440700',
  name: 'desk-risk',
  description: null,
  rules: [],
  compositions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('resolvePolicyPackSelection', () => {
  it('prefers top-level intent policyPackId over wallet and global defaults', async () => {
    const resolved = await resolvePolicyPackSelection({
      intent: {
        walletId: '550e8400-e29b-41d4-a716-446655440701',
        policyPackId: pack.id,
      },
      walletDefaultPolicyPackId: '550e8400-e29b-41d4-a716-446655440702',
      globalDefaultPolicyPackId: '550e8400-e29b-41d4-a716-446655440703',
      loadPolicyPack: async (id) => ({ ...pack, id }),
    });

    expect(resolved).toMatchObject({
      policyPack: { id: pack.id },
      source: 'intent',
    });
  });

  it('falls back through wallet, strategy, and global selectors while preserving compatibility', async () => {
    const walletResolved = await resolvePolicyPackSelection({
      intent: {
        walletId: '550e8400-e29b-41d4-a716-446655440704',
      },
      walletDefaultPolicyPackId: '550e8400-e29b-41d4-a716-446655440705',
      loadPolicyPack: async (id) => ({ ...pack, id }),
    });
    expect(walletResolved).toMatchObject({
      policyPack: { id: '550e8400-e29b-41d4-a716-446655440705' },
      source: 'wallet_default',
    });

    const strategyResolved = await resolvePolicyPackSelection({
      intent: {
        walletId: '550e8400-e29b-41d4-a716-446655440704',
      },
      strategyPolicyPackId: '550e8400-e29b-41d4-a716-446655440706',
      loadPolicyPack: async (id) => ({ ...pack, id }),
    });
    expect(strategyResolved).toMatchObject({
      policyPack: { id: '550e8400-e29b-41d4-a716-446655440706' },
      source: 'strategy_config',
    });

    const globalResolved = await resolvePolicyPackSelection({
      intent: {
        walletId: '550e8400-e29b-41d4-a716-446655440704',
      },
      globalDefaultPolicyPackId: '550e8400-e29b-41d4-a716-446655440707',
      loadPolicyPack: async (id) => ({ ...pack, id }),
    });
    expect(globalResolved).toMatchObject({
      policyPack: { id: '550e8400-e29b-41d4-a716-446655440707' },
      source: 'global_default',
    });
  });
});
