import { describe, expect, it } from 'vitest';
import { canTransitionIntentStatus } from './lifecycle.js';

describe('intent transitions', () => {
  it('allows forward pipeline', () => {
    expect(canTransitionIntentStatus('created', 'quoted')).toBe(true);
    expect(canTransitionIntentStatus('quoted', 'routed')).toBe(true);
    expect(canTransitionIntentStatus('routed', 'policy_checked')).toBe(true);
    expect(canTransitionIntentStatus('policy_checked', 'executed')).toBe(true);
  });

  it('blocks invalid jumps', () => {
    expect(canTransitionIntentStatus('created', 'executed')).toBe(false);
  });
});
