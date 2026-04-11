import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  symbol: text('symbol').notNull().unique(),
  name: text('name').notNull(),
  decimals: integer('decimals').notNull().default(8),
});
