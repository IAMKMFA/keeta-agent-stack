import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';

export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  adapterId: text('adapter_id').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
