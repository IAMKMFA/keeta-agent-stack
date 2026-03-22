import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const strategies = pgTable('strategies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
