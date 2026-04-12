import { describe, expect, it } from 'vitest';
import { CreatePolicyPackSchema, PolicyCompositionSchema, PolicyPackSchema } from './index.js';

describe('policy pack schemas', () => {
  it('round-trips persisted policy packs', () => {
    const now = new Date().toISOString();
    const pack = {
      id: '550e8400-e29b-41d4-a716-446655440201',
      name: 'desk-risk',
      description: 'Desk-specific policy pack',
      rules: [
        {
          ruleId: 'max-slippage',
          priority: 50,
          configKey: 'maxSlippageBps',
          enabled: true,
          config: { limit: 150 },
        },
      ],
      compositions: [
        {
          ruleId: 'desk-all-of',
          operator: 'allOf' as const,
          children: ['max-slippage'],
          enabled: true,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    expect(PolicyPackSchema.parse(pack)).toEqual(pack);
  });

  it('enforces not-composition child cardinality and create payloads', () => {
    expect(() =>
      PolicyCompositionSchema.parse({
        ruleId: 'negate',
        operator: 'not',
        children: ['a', 'b'],
      })
    ).toThrow(/exactly one child/i);

    expect(
      CreatePolicyPackSchema.parse({
        name: 'desk-risk',
        rules: [],
        compositions: [],
      })
    ).toMatchObject({ name: 'desk-risk' });
  });
});
