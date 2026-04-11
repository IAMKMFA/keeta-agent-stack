/**
 * Typed extension points for Phase 3 roadmap features — no runtime behavior.
 * Implementations should live in apps/worker, storage, or dedicated packages.
 */

/** Append-only audit chain of intent → policy → route → receipt (verifiable journal). */
export interface VerifiableExecutionJournal {
  appendEntry(_entry: JournalEntry): Promise<void>;
}

export interface JournalEntry {
  intentHash: string;
  policyVersion: string;
  routeId: string;
  receiptRef: string;
  merkleRoot?: string;
}

/** Coordinate intents across multiple Keeta accounts / vault roles. */
export interface VaultOrchestrator {
  registerSubAccount(_id: string, _meta: Record<string, unknown>): void;
}

/** Operator visibility: queues, adapters, RPC health. */
export interface OperatorCockpit {
  queueDepth(_name: string): Promise<number>;
  adapterSlo(_adapterId: string): Promise<{ p99Ms: number } | null>;
}

/** NL → schema-valid intent drafts (human approval still required). */
export interface IntentCopilot {
  draftIntent(_text: string): Promise<{ intent: Record<string, unknown>; warnings: string[] }>;
}
