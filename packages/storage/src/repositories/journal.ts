import type { VerifiableExecutionJournal } from '@keeta-agent-stack/core';
import type { JournalEntry } from '@keeta-agent-stack/core';
import type { Database } from '../db';
import { executionJournalEntries } from '../schema/journal';

export interface JournalAppendContext {
  intentId: string;
  executionId?: string;
}

/**
 * Postgres-backed {@link VerifiableExecutionJournal} — append-only rows in `execution_journal_entries`.
 */
export function createVerifiableExecutionJournal(
  db: Database,
  ctx: JournalAppendContext
): VerifiableExecutionJournal {
  return {
    async appendEntry(entry: JournalEntry): Promise<void> {
      await db.insert(executionJournalEntries).values({
        intentId: ctx.intentId,
        executionId: ctx.executionId,
        intentHash: entry.intentHash,
        policyVersion: entry.policyVersion,
        routeId: entry.routeId,
        receiptRef: entry.receiptRef,
        merkleRoot: entry.merkleRoot,
      });
    },
  };
}
