import {
  boolean,
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

export const subscriptionTemplates = pgTable('subscription_templates', {
  id: integer('id').primaryKey()
});

export const modCommerceProducts = pgTable(
  'mod_commerce_products',
  {
    id: serial('id').primaryKey(),
    productKey: varchar('product_key', { length: 120 }).notNull(),
    name: varchar('name', { length: 160 }).notNull(),
    description: text('description'),
    kind: varchar('kind', { length: 20 }).notNull().default('one_time'),
    subscriptionTemplateId: integer('subscription_template_id').references(
      () => subscriptionTemplates.id
    ),
    metadata: text('metadata'),
    createdByUserId: integer('created_by_user_id').references(() => users.id),
    updatedByUserId: integer('updated_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    productKeyUnique: uniqueIndex('mod_commerce_products_key_idx').on(
      table.productKey
    ),
    kindIndex: index('mod_commerce_products_kind_idx').on(table.kind),
    templateIndex: index('mod_commerce_products_template_idx').on(
      table.subscriptionTemplateId
    ),
    kindCheck: check(
      'mod_commerce_products_kind_chk',
      sql`${table.kind} in ('subscription', 'one_time')`
    ),
    subscriptionScopeIntegrityCheck: check(
      'mod_commerce_products_subscription_scope_chk',
      sql`(
        (${table.kind} = 'subscription' and ${table.subscriptionTemplateId} is not null) or
        (${table.kind} = 'one_time' and ${table.subscriptionTemplateId} is null)
      )`
    )
  })
);

export const modCommerceProductPrices = pgTable(
  'mod_commerce_product_prices',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => modCommerceProducts.id),
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    unitAmountCents: integer('unit_amount_cents').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    provider: varchar('provider', { length: 30 }),
    providerPriceId: text('provider_price_id'),
    metadata: text('metadata'),
    effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
    effectiveTo: timestamp('effective_to'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    productIndex: index('mod_commerce_product_prices_product_idx').on(
      table.productId
    ),
    productActiveIndex: index('mod_commerce_product_prices_active_idx').on(
      table.productId,
      table.isActive
    ),
    providerPriceUnique: uniqueIndex(
      'mod_commerce_product_prices_provider_price_idx'
    )
      .on(table.provider, table.providerPriceId)
      .where(sql`${table.providerPriceId} is not null`),
    currencyCheck: check(
      'mod_commerce_product_prices_currency_chk',
      sql`char_length(${table.currency}) between 3 and 10`
    ),
    amountCheck: check(
      'mod_commerce_product_prices_amount_chk',
      sql`${table.unitAmountCents} >= 0`
    )
  })
);

export const modCommerceProductPublication = pgTable(
  'mod_commerce_product_publication',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => modCommerceProducts.id),
    isPublished: boolean('is_published').notNull().default(false),
    publishedAt: timestamp('published_at'),
    unpublishedAt: timestamp('unpublished_at'),
    publishedByUserId: integer('published_by_user_id').references(() => users.id),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    productUnique: uniqueIndex('mod_commerce_product_publication_product_idx').on(
      table.productId
    ),
    publishedIndex: index('mod_commerce_product_publication_state_idx').on(
      table.isPublished,
      table.updatedAt
    )
  })
);

export type ModCommerceProduct = typeof modCommerceProducts.$inferSelect;
export type NewModCommerceProduct = typeof modCommerceProducts.$inferInsert;

export type ModCommerceProductPrice = typeof modCommerceProductPrices.$inferSelect;
export type NewModCommerceProductPrice =
  typeof modCommerceProductPrices.$inferInsert;

export type ModCommerceProductPublication =
  typeof modCommerceProductPublication.$inferSelect;
export type NewModCommerceProductPublication =
  typeof modCommerceProductPublication.$inferInsert;
