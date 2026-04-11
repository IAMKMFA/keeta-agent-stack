import { z } from 'zod';

/** Intent row `status` progression (subset enforced in worker). */
export const IntentPipelineStateSchema = z.enum([
  'created',
  'quoted',
  'routed',
  'policy_checked',
  'executed',
  'failed',
  'held',
]);

export type IntentPipelineState = z.infer<typeof IntentPipelineStateSchema>;

const allowedNext: Record<string, Set<IntentPipelineState>> = {
  created: new Set(['quoted', 'held', 'failed']),
  quoted: new Set(['routed', 'held', 'failed']),
  routed: new Set(['policy_checked', 'held', 'failed']),
  policy_checked: new Set(['executed', 'held', 'failed']),
  executed: new Set(['failed']),
  failed: new Set(),
  held: new Set(['quoted', 'routed', 'policy_checked', 'executed', 'failed', 'created']),
};

export function canTransitionIntentStatus(from: string, to: IntentPipelineState): boolean {
  const set = allowedNext[from];
  if (!set) return allowedNext.held!.has(to);
  return set.has(to);
}

/** Execution settlement / processing lifecycle (stored on executions.lifecycle_state when set). */
export const ExecutionLifecycleStateSchema = z.enum([
  'pending',
  'submitted',
  'confirmed',
  'failed',
  'unknown',
]);

export type ExecutionLifecycleState = z.infer<typeof ExecutionLifecycleStateSchema>;
