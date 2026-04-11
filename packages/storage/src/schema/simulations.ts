import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';
import { routePlans } from './routes';

export const simulationRuns = pgTable('simulation_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  routePlanId: uuid('route_plan_id').references(() => routePlans.id),
  status: text('status').notNull().default('pending'),
  scenario: jsonb('scenario').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const simulationResults = pgTable('simulation_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id')
    .references(() => simulationRuns.id)
    .notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
