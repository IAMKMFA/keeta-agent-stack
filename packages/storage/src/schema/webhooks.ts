import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const webhookSubscriptions = pgTable(
  'webhook_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    targetUrl: text('target_url').notNull(),
    eventTypes: jsonb('event_types').$type<string[]>().notNull(),
    status: text('status').notNull(),
    secret: text('secret'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index('webhook_subscriptions_status_idx').on(table.status),
  })
);

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    subscriptionId: uuid('subscription_id')
      .references(() => webhookSubscriptions.id)
      .notNull(),
    auditEventId: uuid('audit_event_id').notNull(),
    status: text('status').notNull(),
    eventSource: text('event_source').notNull().default('audit'),
    attemptCount: integer('attempt_count').notNull().default(0),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    lastError: text('last_error'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueDeliveryIdx: uniqueIndex('webhook_deliveries_subscription_event_idx').on(
      table.subscriptionId,
      table.auditEventId
    ),
    statusIdx: index('webhook_deliveries_status_idx').on(table.status, table.nextAttemptAt),
  })
);
