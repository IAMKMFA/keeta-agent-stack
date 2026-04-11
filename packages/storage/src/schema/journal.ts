import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';
import { executions } from './executions';

/** Append-only verifiable execution journal (intent → policy version → route → receipt). */
export const executionJournalEntries = pgTable('execution_journal_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  executionId: uuid('execution_id').references(() => executions.id),
  intentHash: text('intent_hash').notNull(),
  policyVersion: text('policy_version').notNull(),
  routeId: text('route_id').notNull(),
  receiptRef: text('receipt_ref').notNull(),
  merkleRoot: text('merkle_root'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
