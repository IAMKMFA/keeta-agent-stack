import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const strategies = pgTable('strategies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
  /** Stable key for dashboard templates (e.g. paper-trader) */
  slug: text('slug'),
  description: text('description'),
  isTemplate: boolean('is_template').default(false).notNull(),
  paused: boolean('paused').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
