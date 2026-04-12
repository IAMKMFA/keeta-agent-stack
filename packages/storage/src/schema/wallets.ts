import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: text('label').notNull(),
  address: text('address').notNull().unique(),
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
