import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';

export const policyDecisions = pgTable('policy_decisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
