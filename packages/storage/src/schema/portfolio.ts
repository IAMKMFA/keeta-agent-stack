import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { wallets } from './wallets';

export const portfolioState = pgTable('portfolio_state', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletId: uuid('wallet_id')
    .references(() => wallets.id)
    .notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
