import { doublePrecision, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const metricSamples = pgTable('metric_samples', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  labels: jsonb('labels').$type<Record<string, unknown>>().notNull().default({}),
  value: doublePrecision('value').notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
});
