import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';

export const policySnapshots = pgTable('policy_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  policyConfigHash: text('policy_config_hash'),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const intentSnapshots = pgTable('intent_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  snapshotAt: timestamp('snapshot_at', { withTimezone: true }).defaultNow().notNull(),
});

export const routeSnapshots = pgTable('route_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id')
    .references(() => executionIntents.id)
    .notNull(),
  routePlanId: uuid('route_plan_id').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
