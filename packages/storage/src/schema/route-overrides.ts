import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';

export const routeOverrides = pgTable('route_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  routePlanId: uuid('route_plan_id').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
