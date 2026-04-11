import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { wallets } from './wallets';
import { strategies } from './strategies';

export const executionIntents = pgTable('execution_intents', {
  id: uuid('id').defaultRandom().primaryKey(),
  strategyId: uuid('strategy_id').references(() => strategies.id),
  walletId: uuid('wallet_id')
    .references(() => wallets.id)
    .notNull(),
  status: text('status').notNull().default('created'),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  requiresApproval: boolean('requires_approval').notNull().default(false),
  approvalStatus: text('approval_status').notNull().default('not_required'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
