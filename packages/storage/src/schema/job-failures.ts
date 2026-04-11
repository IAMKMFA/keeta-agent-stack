import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { executionIntents } from './intents';

export const jobFailures = pgTable('job_failures', {
  id: uuid('id').defaultRandom().primaryKey(),
  intentId: uuid('intent_id').references(() => executionIntents.id),
  queueName: text('queue_name').notNull(),
  jobId: text('job_id'),
  errorText: text('error_text').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
