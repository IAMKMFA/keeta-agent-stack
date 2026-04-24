import type { PolicyComposition, PolicyRule } from '@keeta-agent-stack/policy';
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';

export const policyDecisions = pgTable(
  'policy_decisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    intentId: uuid('intent_id')
      .references(() => executionIntents.id)
      .notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    ruleContributions: jsonb('rule_contributions').$type<unknown[] | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    intentIdx: index('policy_decisions_intent_id_idx').on(table.intentId),
  })
);

export const policyPacks = pgTable('policy_packs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  rules: jsonb('rules').$type<PolicyRule[]>().notNull().default([]),
  compositions: jsonb('compositions').$type<PolicyComposition[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
