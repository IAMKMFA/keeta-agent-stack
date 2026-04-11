import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const paymentAnchors = pgTable('payment_anchors', {
  id: uuid('id').defaultRandom().primaryKey(),
  adapterId: text('adapter_id').notNull().unique(),
  label: text('label').notNull(),
  status: text('status').notNull().default('draft'),
  corridorKey: text('corridor_key'),
  operatorRef: text('operator_ref'),
  publicLabel: boolean('public_label').notNull().default(true),
  corridorConfig: jsonb('corridor_config').$type<Record<string, unknown>>().notNull().default({}),
  supportedAssets: jsonb('supported_assets').$type<string[]>().notNull().default([]),
  commercialTerms: jsonb('commercial_terms').$type<Record<string, unknown>>().notNull().default({}),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const anchorBonds = pgTable('anchor_bonds', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentAnchorId: uuid('payment_anchor_id')
    .references(() => paymentAnchors.id)
    .notNull(),
  amountAtomic: text('amount_atomic').notNull(),
  assetId: text('asset_id').notNull().default('KTA'),
  delayDays: integer('delay_days').notNull(),
  status: text('status').notNull().default('pending_lock'),
  lockTxHash: text('lock_tx_hash'),
  lockAccount: text('lock_account'),
  withdrawalRequestedAt: timestamp('withdrawal_requested_at', { withTimezone: true }),
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  verified: boolean('verified').notNull().default(false),
  verificationSource: text('verification_source'),
  verificationDetails: jsonb('verification_details').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const anchorEvents = pgTable('anchor_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentAnchorId: uuid('payment_anchor_id')
    .references(() => paymentAnchors.id)
    .notNull(),
  anchorBondId: uuid('anchor_bond_id').references(() => anchorBonds.id),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
