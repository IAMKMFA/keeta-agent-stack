import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';

export const executions = pgTable(
  'executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    intentId: uuid('intent_id')
      .references(() => executionIntents.id)
      .notNull(),
    adapterId: text('adapter_id').notNull(),
    status: text('status').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    /** Primary on-chain reference (e.g. block hash from vote staple) */
    txHash: text('tx_hash'),
    blockHeight: text('block_height'),
    settlementState: text('settlement_state'),
    receipt: jsonb('receipt').$type<Record<string, unknown> | null>(),
    lifecycleState: text('lifecycle_state'),
    lastJobError: text('last_job_error'),
    lastJobId: text('last_job_id'),
    normalizedReceipt: jsonb('normalized_receipt').$type<Record<string, unknown> | null>(),
    /** Timestamp when the execution job began processing (set at job start). */
    startedAt: timestamp('started_at', { withTimezone: true }),
    /** Observed settlement latency in milliseconds (startedAt → completion). */
    settlementLatencyMs: integer('settlement_latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    intentIdx: index('executions_intent_id_idx').on(table.intentId),
  })
);
