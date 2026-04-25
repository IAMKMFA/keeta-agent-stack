import { describe, expect, it } from 'vitest';
import { PolicyEngine } from './engine.js';
import { applyPolicyPack } from './pack-runtime.js';

describe('applyPolicyPack', () => {
  it('disables known rules and registers compositions from a persisted pack', () => {
    const engine = new PolicyEngine();
    const result = applyPolicyPack(engine, {
      id: '550e8400-e29b-41d4-a716-446655440301',
      name: 'live-override',
      description: 'Disable live mode guard and add a composition',
      rules: [
        {
          ruleId: 'live_mode_enabled',
          enabled: false,
        },
      ],
      compositions: [
        {
          ruleId: 'route_gate',
          operator: 'anyOf',
          children: ['unsupported_route', 'live_mode_enabled'],
          enabled: false,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(engine.isEnabled('live_mode_enabled')).toBe(false);
    expect(engine.has('route_gate')).toBe(true);
    expect(engine.isEnabled('route_gate')).toBe(false);
    expect(result.warnings).toEqual([]);
  });

  it('collects warnings for unknown rule references and composition conflicts', () => {
    const engine = new PolicyEngine({ includeDefaultRules: false });
    const result = applyPolicyPack(engine, {
      id: '550e8400-e29b-41d4-a716-446655440302',
      name: 'bad-pack',
      rules: [
        {
          ruleId: 'missing_rule',
          enabled: false,
          config: { minSize: 10 },
        },
      ],
      compositions: [
        {
          ruleId: 'missing_rule',
          operator: 'not',
          children: ['some_child'],
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(result.customRuleConfig).toEqual({
      missing_rule: { minSize: 10 },
    });
    expect(result.warnings.some((warning) => warning.includes('unknown rule'))).toBe(true);
  });

  it('stores built-in rule config under the canonical config key', () => {
    const engine = new PolicyEngine();
    const result = applyPolicyPack(engine, {
      id: '550e8400-e29b-41d4-a716-446655440303',
      name: 'slippage-pack',
      rules: [
        {
          ruleId: 'max_slippage',
          config: { maxSlippageBps: 25 },
        },
      ],
      compositions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    expect(result.customRuleConfig).toEqual({
      maxSlippageBps: { maxSlippageBps: 25 },
    });
    expect(result.warnings).toEqual([]);
  });
});
