import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';
import { executions } from './executions';

export const executionAuditEvents = pgTable('execution_audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  executionId: uuid('execution_id').references(() => executions.id),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  correlationId: text('correlation_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
