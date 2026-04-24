import type { ExecutionIntent, RoutePlan } from '@keeta-agent-stack/types';

export type {
  VerifiableExecutionJournal,
  JournalEntry,
  VaultOrchestrator,
  OperatorCockpit,
  IntentCopilot,
} from './future-hooks.js';
export { InMemoryVaultOrchestrator } from './vault-orchestrator.js';

/** Bump when pipeline semantics change (for consumers / migrations). */
export const PIPELINE_SCHEMA_VERSION = 1;

/** High-level pipeline stages for observability and worker routing. */
export type PipelineStage =
  | 'created'
  | 'quoted'
  | 'routed'
  | 'policy_checked'
  | 'simulated'
  | 'executed'
  | 'failed';

export interface PipelineContext {
  intent: ExecutionIntent;
  routePlan?: RoutePlan;
  stage: PipelineStage;
}
