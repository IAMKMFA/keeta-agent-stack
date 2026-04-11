import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { definePolicyComposition, definePolicyRule, PolicyEngine } from './index.js';
import type { PolicyContext } from './types.js';

function createContext(): PolicyContext {
  return {
    intent: {
      id: '550e8400-e29b-41d4-a716-446655440123',
      walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      baseAsset: 'USD',
      quoteAsset: 'AED',
      side: 'sell',
      size: '100',
      maxSlippageBps: 50,
      mode: 'live',
      createdAt: new Date().toISOString(),
    },
    config: {
      maxOrderSize: 1_000_000,
      maxSlippageBps: 500,
      venueAllowlist: [],
      assetAllowlist: [],
      liveModeEnabled: true,
    },
  };
}

describe('PolicyEngine', () => {
  it('registers and evaluates a custom rule', () => {
    const engine = new PolicyEngine({ includeDefaultRules: false });
    engine.register(
      definePolicyRule({
        ruleId: 'test_custom_rule',
        evaluate: (ctx) => ({
          ruleId: 'test_custom_rule',
          passed: ctx.intent.baseAsset === 'USD',
          reason: 'Checks base asset',
        }),
      })
    );

    const decision = engine.evaluate(createContext());

    expect(decision.allowed).toBe(true);
    expect(decision.contributions.map((c) => c.ruleId)).toEqual(['test_custom_rule']);
  });

  it('orders rules by priority and supports unregister', () => {
    const engine = new PolicyEngine({ includeDefaultRules: false });
    engine.register(
      definePolicyRule({
        ruleId: 'low_priority',
        priority: 1,
        evaluate: () => ({ ruleId: 'low_priority', passed: true }),
      })
    );
    engine.register(
      definePolicyRule({
        ruleId: 'high_priority',
        priority: 10,
        evaluate: () => ({ ruleId: 'high_priority', passed: true }),
      })
    );

    expect(engine.listRules().map((rule) => rule.ruleId)).toEqual(['high_priority', 'low_priority']);
    expect(engine.unregister('high_priority')).toBe(true);
    expect(engine.listRules().map((rule) => rule.ruleId)).toEqual(['low_priority']);
  });

  it('describes registered rules for discovery surfaces', () => {
    const engine = new PolicyEngine({ includeDefaultRules: false });
    engine.register(
      definePolicyRule({
        ruleId: 'described_rule',
        description: 'Helpful rule description',
        configKey: 'rule_config',
        priority: 5,
        configSchema: z.object({ enabled: z.boolean() }),
        evaluate: () => ({ ruleId: 'described_rule', passed: true }),
      })
    );

    expect(engine.listRuleMetadata()).toEqual([
      {
        ruleId: 'described_rule',
        description: 'Helpful rule description',
        configKey: 'rule_config',
        priority: 5,
        hasConfigSchema: true,
        source: 'custom',
        enabled: true,
        kind: 'rule',
        operator: undefined,
        children: undefined,
      },
    ]);
  });

  it('validates custom rule config with a schema', () => {
    const engine = new PolicyEngine({ includeDefaultRules: false });
    engine.register(
      definePolicyRule<{ minSize: number }>({
        ruleId: 'min_notional',
        configSchema: z.object({
          minSize: z.number().positive(),
        }),
        evaluate: (ctx, config) => {
          const passed = Number(ctx.intent.size) >= (config?.minSize ?? 0);
          return {
            ruleId: 'min_notional',
            passed,
            reason: passed ? 'Min size satisfied' : 'Min size not met',
          };
        },
      })
    );

    const invalid = engine.evaluate({
      ...createContext(),
      customRuleConfig: {
        min_notional: {
          minSize: 'not-a-number',
        },
      },
    });
    expect(invalid.allowed).toBe(false);
    expect(invalid.contributions[0]?.ruleId).toBe('min_notional');
    expect(invalid.contributions[0]?.reason).toContain('Invalid custom rule config');

    const valid = engine.evaluate({
      ...createContext(),
      customRuleConfig: {
        min_notional: {
          minSize: 50,
        },
      },
    });
    expect(valid.allowed).toBe(true);
    expect(valid.contributions[0]?.reason).toBe('Min size satisfied');
  });

  it('supports enable and disable toggles', () => {
    const engine = new PolicyEngine({ includeDefaultRules: false });
    engine.register(
      definePolicyRule({
        ruleId: 'disabled_rule',
        evaluate: () => ({ ruleId: 'disabled_rule', passed: false, reason: 'Should be skipped' }),
      })
    );

    expect(engine.disable('disabled_rule')).toBe(true);
    expect(engine.isEnabled('disabled_rule')).toBe(false);

    const decision = engine.evaluate(createContext());
    expect(decision.allowed).toBe(true);
    expect(decision.contributions).toEqual([]);

    expect(engine.enable('disabled_rule')).toBe(true);
    expect(engine.isEnabled('disabled_rule')).toBe(true);
  });

  it('supports allOf and anyOf policy compositions', () => {
    const engine = new PolicyEngine({ includeDefaultRules: false });
    engine.register(
      definePolicyRule({
        ruleId: 'base_is_usd',
        evaluate: (ctx) => ({ ruleId: 'base_is_usd', passed: ctx.intent.baseAsset === 'USD' }),
      })
    );
    engine.register(
      definePolicyRule({
        ruleId: 'quote_is_aed',
        evaluate: (ctx) => ({ ruleId: 'quote_is_aed', passed: ctx.intent.quoteAsset === 'AED' }),
      })
    );
    engine.register(
      definePolicyRule({
        ruleId: 'quote_is_eur',
        evaluate: (ctx) => ({ ruleId: 'quote_is_eur', passed: ctx.intent.quoteAsset === 'EUR' }),
      })
    );
    engine.registerComposition(
      definePolicyComposition({
        ruleId: 'corridor_all',
        operator: 'allOf',
        children: ['base_is_usd', 'quote_is_aed'],
      })
    );
    engine.registerComposition(
      definePolicyComposition({
        ruleId: 'corridor_any',
        operator: 'anyOf',
        children: ['quote_is_aed', 'quote_is_eur'],
      })
    );
    engine.disable('base_is_usd');
    engine.disable('quote_is_aed');
    engine.disable('quote_is_eur');

    const decision = engine.evaluate(createContext());
    expect(decision.allowed).toBe(true);
    expect(decision.contributions.map((contribution) => contribution.ruleId)).toEqual(['corridor_all', 'corridor_any']);
    expect(decision.contributions.every((contribution) => contribution.passed)).toBe(true);
  });

  it('supports not policy compositions', () => {
    const engine = new PolicyEngine({ includeDefaultRules: false });
    engine.register(
      definePolicyRule({
        ruleId: 'live_mode',
        evaluate: (ctx) => ({ ruleId: 'live_mode', passed: ctx.intent.mode === 'live' }),
      })
    );
    engine.registerComposition(
      definePolicyComposition({
        ruleId: 'not_live_mode',
        operator: 'not',
        children: ['live_mode'],
      })
    );
    engine.disable('live_mode');

    const decision = engine.evaluate(createContext());
    expect(decision.allowed).toBe(false);
    expect(decision.contributions[0]?.ruleId).toBe('not_live_mode');
    expect(decision.contributions[0]?.passed).toBe(false);
  });
});
