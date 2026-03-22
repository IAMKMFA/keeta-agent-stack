import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { wallets } from './wallets';
import { assets } from './assets';

export const balanceSnapshots = pgTable('balance_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletId: uuid('wallet_id')
    .references(() => wallets.id)
    .notNull(),
  assetId: uuid('asset_id')
    .references(() => assets.id)
    .notNull(),
  amount: text('amount').notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
});
