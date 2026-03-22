import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';

export const executions = pgTable('executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  adapterId: text('adapter_id').notNull(),
  status: text('status').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
