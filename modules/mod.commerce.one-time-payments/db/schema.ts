import {
  check,
  index,
  integer,
  pgTable,
  serial,
  sql,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from '@skitsaas/sdk/db';

export const users = pgTable('users', {
  id: integer('id').primaryKey()
});

export const teams = pgTable('teams', {
  id: integer('id').primaryKey()
});

export const paymentOrders = pgTable('payment_orders', {
  id: integer('id').primaryKey()
});

export const teamMembers = pgTable('team_members', {
  teamId: integer('team_id').notNull(),
  userId: integer('user_id').notNull()
});

export const modCommerceOnetimeIntents = pgTable(
  'mod_commerce_onetime_intents',
  {
    id: serial('id').primaryKey(),
    intentKey: varchar('intent_key', { length: 120 }).notNull(),
    productId: integer('product_id').notNull(),
    provider: varchar('provider', { length: 30 }).notNull().default('stripe'),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    targetType: varchar('target_type', { length: 20 }).notNull().default('user'),
    targetUserId: integer('target_user_id').references(() => users.id),
    targetTeamId: integer('target_team_id').references(() => teams.id),
    amount: integer('amount').notNull(),
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    sessionId: text('session_id'),
    providerIntentId: text('provider_intent_id'),
    checkoutUrl: text('checkout_url'),
    idempotencyKey: varchar('idempotency_key', { length: 160 }),
    productSnapshot: text('product_snapshot').notNull(),
    metadata: text('metadata'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    intentKeyUnique: uniqueIndex('mod_commerce_onetime_intents_key_idx').on(
      table.intentKey
    ),
    providerIntentUnique: uniqueIndex(
      'mod_commerce_onetime_intents_provider_intent_idx'
    )
      .on(table.provider, table.providerIntentId)
      .where(sql`${table.providerIntentId} is not null`),
    providerSessionUnique: uniqueIndex(
      'mod_commerce_onetime_intents_provider_session_idx'
    )
      .on(table.provider, table.sessionId)
      .where(sql`${table.sessionId} is not null`),
    idempotencyKeyUnique: uniqueIndex(
      'mod_commerce_onetime_intents_idempotency_idx'
    )
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    productIndex: index('mod_commerce_onetime_intents_product_idx').on(
      table.productId
    ),
    statusIndex: index('mod_commerce_onetime_intents_status_idx').on(
      table.status,
      table.updatedAt
    ),
    targetUserIndex: index('mod_commerce_onetime_intents_target_user_idx').on(
      table.targetType,
      table.targetUserId
    ),
    targetTeamIndex: index('mod_commerce_onetime_intents_target_team_idx').on(
      table.targetType,
      table.targetTeamId
    ),
    amountCheck: check(
      'mod_commerce_onetime_intents_amount_chk',
      sql`${table.amount} >= 0`
    ),
    currencyCheck: check(
      'mod_commerce_onetime_intents_currency_chk',
      sql`char_length(${table.currency}) between 3 and 10`
    ),
    targetTypeCheck: check(
      'mod_commerce_onetime_intents_target_type_chk',
      sql`${table.targetType} in ('team', 'user')`
    ),
    targetIntegrityCheck: check(
      'mod_commerce_onetime_intents_target_integrity_chk',
      sql`(
        (${table.targetType} = 'team' and ${table.targetTeamId} is not null and ${table.targetUserId} is null) or
        (${table.targetType} = 'user' and ${table.targetUserId} is not null and ${table.targetTeamId} is null)
      )`
    ),
    statusCheck: check(
      'mod_commerce_onetime_intents_status_chk',
      sql`${table.status} in ('pending', 'session_created', 'paid', 'failed', 'canceled', 'refunded')`
    )
  })
);

export const modCommerceOnetimeFulfillments = pgTable(
  'mod_commerce_onetime_fulfillments',
  {
    id: serial('id').primaryKey(),
    intentId: integer('intent_id')
      .notNull()
      .references(() => modCommerceOnetimeIntents.id),
    orderId: integer('order_id').references(() => paymentOrders.id),
    status: varchar('status', { length: 30 }).notNull().default('pending'),
    providerEventId: text('provider_event_id'),
    externalPaymentId: text('external_payment_id'),
    amount: integer('amount'),
    currency: varchar('currency', { length: 10 }),
    payload: text('payload'),
    metadata: text('metadata'),
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    intentUnique: uniqueIndex('mod_commerce_onetime_fulfillments_intent_idx').on(
      table.intentId
    ),
    providerEventUnique: uniqueIndex(
      'mod_commerce_onetime_fulfillments_provider_event_idx'
    )
      .on(table.providerEventId)
      .where(sql`${table.providerEventId} is not null`),
    orderIndex: index('mod_commerce_onetime_fulfillments_order_idx').on(
      table.orderId
    ),
    statusIndex: index('mod_commerce_onetime_fulfillments_status_idx').on(
      table.status,
      table.updatedAt
    ),
    externalPaymentIndex: index(
      'mod_commerce_onetime_fulfillments_external_payment_idx'
    ).on(table.externalPaymentId),
    amountCheck: check(
      'mod_commerce_onetime_fulfillments_amount_chk',
      sql`${table.amount} is null or ${table.amount} >= 0`
    ),
    currencyCheck: check(
      'mod_commerce_onetime_fulfillments_currency_chk',
      sql`${table.currency} is null or char_length(${table.currency}) between 3 and 10`
    ),
    statusCheck: check(
      'mod_commerce_onetime_fulfillments_status_chk',
      sql`${table.status} in ('pending', 'paid', 'failed', 'canceled', 'refunded')`
    )
  })
);

export type ModCommerceOnetimeIntent = typeof modCommerceOnetimeIntents.$inferSelect;
export type NewModCommerceOnetimeIntent =
  typeof modCommerceOnetimeIntents.$inferInsert;

export type ModCommerceOnetimeFulfillment =
  typeof modCommerceOnetimeFulfillments.$inferSelect;
export type NewModCommerceOnetimeFulfillment =
  typeof modCommerceOnetimeFulfillments.$inferInsert;
