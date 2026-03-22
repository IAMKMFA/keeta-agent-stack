import { integer, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';

export const routePlans = pgTable('route_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  score: real('score').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const routeSteps = pgTable('route_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id')
    .references(() => routePlans.id)
    .notNull(),
  stepIndex: integer('step_index').notNull(),
  adapterId: text('adapter_id').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
});
