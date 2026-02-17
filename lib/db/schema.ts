import {
  check,
  index,
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  accountStatus: varchar('account_status', { length: 20 })
    .notNull()
    .default('active'),
  statusReason: text('status_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeProductId: text('stripe_product_id'),
});

export const subscriptionTemplates = pgTable(
  'subscription_templates',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    targetScope: varchar('target_scope', { length: 20 })
      .notNull()
      .default('organization'),
    categoryKey: varchar('category_key', { length: 120 })
      .notNull()
      .default('legacy'),
    hierarchyRank: integer('hierarchy_rank').notNull().default(0),
    billingInterval: varchar('billing_interval', { length: 20 })
      .notNull()
      .default('monthly'),
    priceCents: integer('price_cents').notNull().default(0),
    compareAtPriceCents: integer('compare_at_price_cents'),
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    trialPeriodDays: integer('trial_period_days').notNull().default(0),
    paypalProductId: text('paypal_product_id'),
    paypalPlanId: text('paypal_plan_id'),
    paypalPlanFingerprint: text('paypal_plan_fingerprint'),
    paypalPlanIdNoTrial: text('paypal_plan_id_no_trial'),
    paypalPlanFingerprintNoTrial: text('paypal_plan_fingerprint_no_trial'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    targetScopeIndex: index('subscription_templates_target_scope_idx').on(
      table.targetScope
    ),
    targetScopeCategoryIndex: index(
      'subscription_templates_scope_category_idx'
    ).on(table.targetScope, table.categoryKey),
    categoryHierarchyRankIndex: index(
      'subscription_templates_category_rank_idx'
    ).on(table.categoryKey, table.hierarchyRank),
    nameIntervalIndex: index('subscription_templates_name_interval_idx').on(
      table.name,
      table.billingInterval
    ),
    categoryKeyCheck: check(
      'subscription_templates_category_key_chk',
      sql`char_length(trim(${table.categoryKey})) > 0`
    ),
  })
);

export const subscriptionTemplateFeatures = pgTable(
  'subscription_template_features',
  {
    id: serial('id').primaryKey(),
    templateId: integer('template_id')
      .notNull()
      .references(() => subscriptionTemplates.id),
    featureKey: varchar('feature_key', { length: 100 }).notNull(),
    featureLabel: varchar('feature_label', { length: 120 })
      .notNull()
      .default(''),
    valueType: varchar('value_type', { length: 20 }).notNull().default('text'),
    featureValue: text('feature_value'),
    valueLabel: text('value_label'),
    isPublic: boolean('is_public').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    templateKeyUnique: uniqueIndex(
      'subscription_template_features_template_key_idx'
    ).on(table.templateId, table.featureKey),
  })
);

export const paymentOrders = pgTable(
  'payment_orders',
  {
    id: serial('id').primaryKey(),
    provider: varchar('provider', { length: 30 }).notNull(),
    orderType: varchar('order_type', { length: 20 })
      .notNull()
      .default('subscription'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    source: varchar('source', { length: 30 }).notNull().default('system'),
    moduleId: varchar('module_id', { length: 120 }),
    teamId: integer('team_id').references(() => teams.id),
    targetType: varchar('target_type', { length: 20 }),
    targetTeamId: integer('target_team_id').references(() => teams.id),
    targetUserId: integer('target_user_id').references(() => users.id),
    subscriptionTemplateId: integer('subscription_template_id').references(
      () => subscriptionTemplates.id
    ),
    paymentMethod: varchar('payment_method', { length: 60 }),
    planName: varchar('plan_name', { length: 100 }),
    providerPlanId: text('provider_plan_id'),
    externalOrderId: text('external_order_id'),
    externalPaymentId: text('external_payment_id'),
    amount: integer('amount'),
    currency: varchar('currency', { length: 10 }),
    message: text('message'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    createdAtIndex: index('payment_orders_created_at_idx').on(table.createdAt),
    statusIndex: index('payment_orders_status_idx').on(table.status),
    providerIndex: index('payment_orders_provider_idx').on(table.provider),
    teamIndex: index('payment_orders_team_id_idx').on(table.teamId),
    targetTeamIndex: index('payment_orders_target_team_idx').on(
      table.targetType,
      table.targetTeamId
    ),
    targetUserIndex: index('payment_orders_target_user_idx').on(
      table.targetType,
      table.targetUserId
    ),
    orderTypeStatusCreatedAtIndex: index(
      'payment_orders_type_status_created_idx'
    ).on(table.orderType, table.status, table.createdAt),
    moduleCreatedAtIndex: index('payment_orders_module_created_at_idx').on(
      table.moduleId,
      table.createdAt
    ),
    providerExternalPaymentUnique: uniqueIndex(
      'payment_orders_provider_external_payment_idx'
    ).on(table.provider, table.externalPaymentId),
    orderTypeCheck: check(
      'payment_orders_order_type_chk',
      sql`${table.orderType} in ('subscription', 'one_time')`
    ),
    targetTypeCheck: check(
      'payment_orders_target_type_chk',
      sql`${table.targetType} is null or ${table.targetType} in ('team', 'user')`
    ),
    targetIntegrityCheck: check(
      'payment_orders_target_integrity_chk',
      sql`(
        (${table.targetType} is null and ${table.targetTeamId} is null and ${table.targetUserId} is null) or
        (${table.targetType} = 'team' and ${table.targetTeamId} is not null and ${table.targetUserId} is null) or
        (${table.targetType} = 'user' and ${table.targetUserId} is not null and ${table.targetTeamId} is null)
      )`
    ),
  })
);

export const subscriptionTrialUsage = pgTable(
  'subscription_trial_usage',
  {
    id: serial('id').primaryKey(),
    targetType: varchar('target_type', { length: 20 }).notNull(),
    targetTeamId: integer('target_team_id').references(() => teams.id),
    targetUserId: integer('target_user_id').references(() => users.id),
    categoryKey: varchar('category_key', { length: 120 }).notNull(),
    firstTemplateId: integer('first_template_id').references(
      () => subscriptionTemplates.id
    ),
    firstOrderId: integer('first_order_id').references(() => paymentOrders.id),
    consumedAt: timestamp('consumed_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    targetTeamIndex: index('subscription_trial_usage_target_team_idx').on(
      table.targetType,
      table.targetTeamId,
      table.categoryKey
    ),
    targetUserIndex: index('subscription_trial_usage_target_user_idx').on(
      table.targetType,
      table.targetUserId,
      table.categoryKey
    ),
    consumedAtIndex: index('subscription_trial_usage_consumed_at_idx').on(
      table.consumedAt
    ),
    uniqueTeamCategory: uniqueIndex(
      'subscription_trial_usage_team_category_unique'
    )
      .on(table.targetType, table.targetTeamId, table.categoryKey)
      .where(
        sql`${table.targetType} = 'team' and ${table.targetTeamId} is not null`
      ),
    uniqueUserCategory: uniqueIndex(
      'subscription_trial_usage_user_category_unique'
    )
      .on(table.targetType, table.targetUserId, table.categoryKey)
      .where(
        sql`${table.targetType} = 'user' and ${table.targetUserId} is not null`
      ),
    targetTypeCheck: check(
      'subscription_trial_usage_target_type_chk',
      sql`${table.targetType} in ('team', 'user')`
    ),
    targetIntegrityCheck: check(
      'subscription_trial_usage_target_integrity_chk',
      sql`(
        (${table.targetType} = 'team' and ${table.targetTeamId} is not null and ${table.targetUserId} is null) or
        (${table.targetType} = 'user' and ${table.targetUserId} is not null and ${table.targetTeamId} is null)
      )`
    ),
    categoryKeyCheck: check(
      'subscription_trial_usage_category_key_chk',
      sql`char_length(trim(${table.categoryKey})) > 0`
    ),
  })
);

export const checkoutOrders = pgTable(
  'checkout_orders',
  {
    id: serial('id').primaryKey(),
    checkoutToken: varchar('checkout_token', { length: 80 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 120 }),
    orderType: varchar('order_type', { length: 20 })
      .notNull()
      .default('subscription'),
    status: varchar('status', { length: 30 }).notNull().default('ready'),
    source: varchar('source', { length: 30 }).notNull().default('pricing'),
    moduleId: varchar('module_id', { length: 120 }),
    teamId: integer('team_id').references(() => teams.id),
    targetType: varchar('target_type', { length: 20 }),
    targetTeamId: integer('target_team_id').references(() => teams.id),
    targetUserId: integer('target_user_id').references(() => users.id),
    subscriptionTemplateId: integer('subscription_template_id').references(
      () => subscriptionTemplates.id
    ),
    selectedProvider: varchar('selected_provider', { length: 30 }),
    selectedPaymentMethod: varchar('selected_payment_method', { length: 60 }),
    providerSessionId: text('provider_session_id'),
    providerReferenceId: text('provider_reference_id'),
    amount: integer('amount'),
    currency: varchar('currency', { length: 10 }),
    planName: varchar('plan_name', { length: 100 }),
    metadata: text('metadata'),
    expiresAt: timestamp('expires_at').notNull(),
    completedAt: timestamp('completed_at'),
    canceledAt: timestamp('canceled_at'),
    failedAt: timestamp('failed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    checkoutTokenUnique: uniqueIndex('checkout_orders_checkout_token_idx').on(
      table.checkoutToken
    ),
    idempotencyKeyUnique: uniqueIndex('checkout_orders_idempotency_key_idx')
      .on(table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    statusExpiresAtIndex: index('checkout_orders_status_expires_idx').on(
      table.status,
      table.expiresAt
    ),
    teamIndex: index('checkout_orders_team_id_idx').on(table.teamId),
    targetTeamIndex: index('checkout_orders_target_team_idx').on(
      table.targetType,
      table.targetTeamId
    ),
    targetUserIndex: index('checkout_orders_target_user_idx').on(
      table.targetType,
      table.targetUserId
    ),
    providerSessionIndex: index('checkout_orders_provider_session_idx').on(
      table.selectedProvider,
      table.providerSessionId
    ),
    providerReferenceIndex: index('checkout_orders_provider_reference_idx').on(
      table.selectedProvider,
      table.providerReferenceId
    ),
    orderTypeCheck: check(
      'checkout_orders_order_type_chk',
      sql`${table.orderType} in ('subscription', 'one_time')`
    ),
    statusCheck: check(
      'checkout_orders_status_chk',
      sql`${table.status} in ('draft', 'ready', 'provider_pending', 'completed', 'canceled', 'failed', 'expired')`
    ),
    targetTypeCheck: check(
      'checkout_orders_target_type_chk',
      sql`${table.targetType} is null or ${table.targetType} in ('team', 'user')`
    ),
    targetIntegrityCheck: check(
      'checkout_orders_target_integrity_chk',
      sql`(
        (${table.targetType} is null and ${table.targetTeamId} is null and ${table.targetUserId} is null) or
        (${table.targetType} = 'team' and ${table.targetTeamId} is not null and ${table.targetUserId} is null) or
        (${table.targetType} = 'user' and ${table.targetUserId} is not null and ${table.targetTeamId} is null)
      )`
    ),
  })
);

export const appConfigs = pgTable(
  'app_configs',
  {
    id: serial('id').primaryKey(),
    namespace: varchar('namespace', { length: 120 }).notNull(),
    configKey: varchar('config_key', { length: 120 }).notNull(),
    configValue: text('config_value').notNull(),
    isSecret: boolean('is_secret').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    namespaceKeyUnique: uniqueIndex('app_configs_namespace_key_idx').on(
      table.namespace,
      table.configKey
    ),
    namespaceIndex: index('app_configs_namespace_idx').on(table.namespace),
  })
);

export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => paymentOrders.id),
    provider: varchar('provider', { length: 30 }).notNull(),
    transactionType: varchar('transaction_type', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    amount: integer('amount'),
    currency: varchar('currency', { length: 10 }),
    externalTransactionId: text('external_transaction_id'),
    providerEventId: text('provider_event_id'),
    dedupeKey: text('dedupe_key'),
    externalInvoiceId: text('external_invoice_id'),
    payload: text('payload'),
    metadata: text('metadata'),
    occurredAt: timestamp('occurred_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    orderIdIndex: index('payment_transactions_order_id_idx').on(table.orderId),
    statusOccurredAtIndex: index('payment_transactions_status_occurred_idx').on(
      table.status,
      table.occurredAt
    ),
    providerExternalTransactionUnique: uniqueIndex(
      'payment_transactions_provider_external_tx_idx'
    )
      .on(table.provider, table.externalTransactionId)
      .where(sql`${table.externalTransactionId} is not null`),
    providerEventUnique: uniqueIndex('payment_transactions_provider_event_idx')
      .on(table.provider, table.providerEventId)
      .where(sql`${table.providerEventId} is not null`),
    providerDedupeUnique: uniqueIndex('payment_transactions_provider_dedupe_idx')
      .on(table.provider, table.dedupeKey)
      .where(sql`${table.dedupeKey} is not null`),
    transactionTypeCheck: check(
      'payment_transactions_type_chk',
      sql`${table.transactionType} in ('authorization', 'capture', 'sale', 'refund', 'chargeback', 'fee')`
    ),
    transactionStatusCheck: check(
      'payment_transactions_status_chk',
      sql`${table.status} in ('pending', 'succeeded', 'failed', 'reversed')`
    ),
  })
);

export const subscriptionAssignments = pgTable(
  'subscription_assignments',
  {
    id: serial('id').primaryKey(),
    targetType: varchar('target_type', { length: 20 }).notNull(),
    targetTeamId: integer('target_team_id').references(() => teams.id),
    targetUserId: integer('target_user_id').references(() => users.id),
    subscriptionTemplateId: integer('subscription_template_id')
      .notNull()
      .references(() => subscriptionTemplates.id),
    paymentProvider: varchar('payment_provider', { length: 20 }),
    providerReferenceId: text('provider_reference_id'),
    providerPlanId: text('provider_plan_id'),
    status: varchar('status', { length: 20 }).notNull().default('free'),
    planName: varchar('plan_name', { length: 100 }),
    currentPeriodStart: timestamp('current_period_start'),
    currentPeriodEnd: timestamp('current_period_end'),
    trialEndsAt: timestamp('trial_ends_at'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at'),
    effectiveFrom: timestamp('effective_from').notNull().defaultNow(),
    effectiveTo: timestamp('effective_to'),
    sourceOrderId: integer('source_order_id').references(() => paymentOrders.id),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    targetTeamIndex: index('subscription_assignments_target_team_idx').on(
      table.targetType,
      table.targetTeamId
    ),
    targetUserIndex: index('subscription_assignments_target_user_idx').on(
      table.targetType,
      table.targetUserId
    ),
    activeTeamUnique: uniqueIndex('subscription_assignments_active_team_idx')
      .on(table.targetType, table.targetTeamId)
      .where(
        sql`${table.targetType} = 'team' and ${table.effectiveTo} is null`
      ),
    activeUserUnique: uniqueIndex('subscription_assignments_active_user_idx')
      .on(table.targetType, table.targetUserId)
      .where(
        sql`${table.targetType} = 'user' and ${table.effectiveTo} is null`
      ),
    targetIntegrityCheck: check(
      'subscription_assignments_target_integrity_chk',
      sql`(
        (${table.targetType} = 'team' and ${table.targetTeamId} is not null and ${table.targetUserId} is null) or
        (${table.targetType} = 'user' and ${table.targetUserId} is not null and ${table.targetTeamId} is null)
      )`
    ),
    statusCheck: check(
      'subscription_assignments_status_chk',
      sql`${table.status} in ('free', 'trialing', 'active', 'unpaid', 'canceled')`
    ),
  })
);

export const subscriptionChangeRequests = pgTable(
  'subscription_change_requests',
  {
    id: serial('id').primaryKey(),
    targetType: varchar('target_type', { length: 20 }).notNull(),
    targetTeamId: integer('target_team_id').references(() => teams.id),
    targetUserId: integer('target_user_id').references(() => users.id),
    currentAssignmentId: integer('current_assignment_id').references(
      () => subscriptionAssignments.id
    ),
    currentTemplateId: integer('current_template_id').references(
      () => subscriptionTemplates.id
    ),
    requestedTemplateId: integer('requested_template_id')
      .notNull()
      .references(() => subscriptionTemplates.id),
    requestedProvider: varchar('requested_provider', { length: 20 }),
    requestedPaymentMethod: varchar('requested_payment_method', { length: 60 }),
    requestedProviderPlanId: text('requested_provider_plan_id'),
    requestedPlanName: varchar('requested_plan_name', { length: 100 }),
    changeReason: varchar('change_reason', { length: 60 }),
    changeMode: varchar('change_mode', { length: 30 })
      .notNull()
      .default('period_end'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    effectiveAt: timestamp('effective_at'),
    sourceOrderId: integer('source_order_id').references(() => paymentOrders.id),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    targetTeamIndex: index('subscription_change_requests_target_team_idx').on(
      table.targetType,
      table.targetTeamId
    ),
    targetUserIndex: index('subscription_change_requests_target_user_idx').on(
      table.targetType,
      table.targetUserId
    ),
    statusEffectiveAtIndex: index(
      'subscription_change_requests_status_effective_idx'
    ).on(table.status, table.effectiveAt),
    targetIntegrityCheck: check(
      'subscription_change_requests_target_integrity_chk',
      sql`(
        (${table.targetType} = 'team' and ${table.targetTeamId} is not null and ${table.targetUserId} is null) or
        (${table.targetType} = 'user' and ${table.targetUserId} is not null and ${table.targetTeamId} is null)
      )`
    ),
    statusCheck: check(
      'subscription_change_requests_status_chk',
      sql`${table.status} in ('pending', 'scheduled', 'processing', 'applied', 'canceled', 'failed')`
    ),
    changeModeCheck: check(
      'subscription_change_requests_change_mode_chk',
      sql`${table.changeMode} in ('period_end', 'immediate')`
    ),
  })
);

export const appModules = pgTable(
  'app_modules',
  {
    id: serial('id').primaryKey(),
    moduleId: varchar('module_id', { length: 120 }).notNull(),
    version: varchar('version', { length: 50 }).notNull().default('0.0.0'),
    status: varchar('status', { length: 20 }).notNull().default('installed'),
    installMode: varchar('install_mode', { length: 20 })
      .notNull()
      .default('core'),
    installedAt: timestamp('installed_at'),
    enabledAt: timestamp('enabled_at'),
    disabledAt: timestamp('disabled_at'),
    uninstalledAt: timestamp('uninstalled_at'),
    lastError: text('last_error'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    moduleIdUnique: uniqueIndex('app_modules_module_id_idx').on(table.moduleId),
    statusIndex: index('app_modules_status_idx').on(table.status),
    statusCheck: check(
      'app_modules_status_chk',
      sql`${table.status} in ('installed', 'enabled', 'disabled', 'uninstalled')`
    ),
    installModeCheck: check(
      'app_modules_install_mode_chk',
      sql`${table.installMode} in ('core', 'plugin')`
    ),
  })
);

export const appThemes = pgTable(
  'app_themes',
  {
    id: serial('id').primaryKey(),
    themeKey: varchar('theme_key', { length: 120 }).notNull(),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    area: varchar('area', { length: 20 }).notNull(),
    tokens: text('tokens').notNull(),
    isBuiltin: boolean('is_builtin').notNull().default(false),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    areaThemeKeyUnique: uniqueIndex('app_themes_area_key_idx').on(
      table.area,
      table.themeKey
    ),
    activeAreaUnique: uniqueIndex('app_themes_active_area_idx')
      .on(table.area)
      .where(sql`${table.isActive} = true`),
    areaActiveIndex: index('app_themes_area_active_idx').on(
      table.area,
      table.isActive
    ),
    areaCheck: check(
      'app_themes_area_chk',
      sql`${table.area} in ('admin', 'dashboard', 'public', 'global')`
    ),
  })
);

export const userThemePreferences = pgTable(
  'user_theme_preferences',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    area: varchar('area', { length: 20 }).notNull(),
    themeKey: varchar('theme_key', { length: 120 }).notNull(),
    mode: varchar('mode', { length: 20 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userAreaUnique: uniqueIndex('user_theme_preferences_user_area_idx').on(
      table.userId,
      table.area
    ),
    areaThemeKeyIndex: index('user_theme_preferences_area_theme_idx').on(
      table.area,
      table.themeKey
    ),
    areaCheck: check(
      'user_theme_preferences_area_chk',
      sql`${table.area} in ('admin', 'dashboard', 'global')`
    ),
    modeCheck: check(
      'user_theme_preferences_mode_chk',
      sql`${table.mode} is null or ${table.mode} in ('system', 'light', 'dark')`
    ),
  })
);

export const paymentLogs = pgTable('payment_logs', {
  id: serial('id').primaryKey(),
  provider: varchar('provider', { length: 30 }).notNull(),
  eventType: varchar('event_type', { length: 120 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('info'),
  teamId: integer('team_id').references(() => teams.id),
  externalId: text('external_id'),
  amount: integer('amount'),
  currency: varchar('currency', { length: 10 }),
  message: text('message'),
  payload: text('payload'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const emailLogs = pgTable(
  'email_logs',
  {
    id: serial('id').primaryKey(),
    provider: varchar('provider', { length: 30 }).notNull().default('smtp'),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('queued'),
    recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
    recipientUserId: integer('recipient_user_id').references(() => users.id),
    subject: varchar('subject', { length: 255 }),
    source: varchar('source', { length: 120 }),
    externalMessageId: text('external_message_id'),
    message: text('message'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    sentAt: timestamp('sent_at'),
  },
  (table) => ({
    createdAtIndex: index('email_logs_created_at_idx').on(table.createdAt),
    statusIndex: index('email_logs_status_idx').on(table.status),
    eventTypeIndex: index('email_logs_event_type_idx').on(table.eventType),
    recipientEmailIndex: index('email_logs_recipient_email_idx').on(
      table.recipientEmail
    ),
    recipientUserIdIndex: index('email_logs_recipient_user_id_idx').on(
      table.recipientUserId
    ),
  })
);

export const sysActivityLogs = pgTable(
  'sys_activity_logs',
  {
    id: serial('id').primaryKey(),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    eventCategory: varchar('event_category', { length: 50 })
      .notNull()
      .default('system'),
    action: varchar('action', { length: 20 }).notNull().default('event'),
    status: varchar('status', { length: 20 }).notNull().default('info'),
    actorUserId: integer('actor_user_id').references(() => users.id),
    actorEmail: varchar('actor_email', { length: 255 }),
    actorRole: varchar('actor_role', { length: 30 }),
    targetUserId: integer('target_user_id').references(() => users.id),
    teamId: integer('team_id').references(() => teams.id),
    entityType: varchar('entity_type', { length: 60 }),
    entityId: varchar('entity_id', { length: 120 }),
    source: varchar('source', { length: 120 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    requestId: varchar('request_id', { length: 100 }),
    message: text('message'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    createdAtIndex: index('sys_activity_logs_created_at_idx').on(table.createdAt),
    eventTypeIndex: index('sys_activity_logs_event_type_idx').on(table.eventType),
    actorUserIdIndex: index('sys_activity_logs_actor_user_id_idx').on(
      table.actorUserId
    ),
    teamIdIndex: index('sys_activity_logs_team_id_idx').on(table.teamId),
    entityIndex: index('sys_activity_logs_entity_idx').on(
      table.entityType,
      table.entityId
    ),
  })
);

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const authExternalIdentities = pgTable(
  'auth_external_identities',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    providerId: varchar('provider_id', { length: 80 }).notNull(),
    providerSubject: varchar('provider_subject', { length: 255 }).notNull(),
    providerEmail: varchar('provider_email', { length: 255 }),
    providerAccountId: varchar('provider_account_id', { length: 255 }),
    displayName: varchar('display_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    claims: text('claims'),
    metadata: text('metadata'),
    linkedAt: timestamp('linked_at').notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    providerSubjectUnique: uniqueIndex(
      'auth_external_identities_provider_subject_idx'
    ).on(table.providerId, table.providerSubject),
    userProviderUnique: uniqueIndex(
      'auth_external_identities_user_provider_idx'
    ).on(table.userId, table.providerId),
    userIndex: index('auth_external_identities_user_idx').on(table.userId),
    providerIndex: index('auth_external_identities_provider_idx').on(
      table.providerId
    ),
  })
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: serial('id').primaryKey(),
    sessionId: varchar('session_id', { length: 120 }).notNull(),
    tokenJti: varchar('token_jti', { length: 120 }).notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    issuedAt: timestamp('issued_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
    revokedReason: text('revoked_reason'),
    lastSeenAt: timestamp('last_seen_at'),
    lastIpAddress: varchar('last_ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sessionIdUnique: uniqueIndex('auth_sessions_session_id_idx').on(
      table.sessionId
    ),
    tokenJtiUnique: uniqueIndex('auth_sessions_token_jti_idx').on(table.tokenJti),
    userStatusIndex: index('auth_sessions_user_status_idx').on(
      table.userId,
      table.status
    ),
    expiresAtIndex: index('auth_sessions_expires_at_idx').on(table.expiresAt),
    statusCheck: check(
      'auth_sessions_status_chk',
      sql`${table.status} in ('active', 'revoked', 'expired')`
    ),
  })
);

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  paymentLogs: many(paymentLogs),
  paymentOrders: many(paymentOrders),
  checkoutOrders: many(checkoutOrders),
  subscriptionTrialUsage: many(subscriptionTrialUsage),
  systemActivityLogs: many(sysActivityLogs),
}));

export const subscriptionTemplatesRelations = relations(
  subscriptionTemplates,
  ({ many }) => ({
    features: many(subscriptionTemplateFeatures),
    paymentOrders: many(paymentOrders),
    checkoutOrders: many(checkoutOrders),
    trialUsage: many(subscriptionTrialUsage),
  })
);

export const subscriptionTemplateFeaturesRelations = relations(
  subscriptionTemplateFeatures,
  ({ one }) => ({
    template: one(subscriptionTemplates, {
      fields: [subscriptionTemplateFeatures.templateId],
      references: [subscriptionTemplates.id],
    }),
  })
);

export const subscriptionTrialUsageRelations = relations(
  subscriptionTrialUsage,
  ({ one }) => ({
    team: one(teams, {
      fields: [subscriptionTrialUsage.targetTeamId],
      references: [teams.id],
    }),
    user: one(users, {
      fields: [subscriptionTrialUsage.targetUserId],
      references: [users.id],
    }),
    template: one(subscriptionTemplates, {
      fields: [subscriptionTrialUsage.firstTemplateId],
      references: [subscriptionTemplates.id],
    }),
    order: one(paymentOrders, {
      fields: [subscriptionTrialUsage.firstOrderId],
      references: [paymentOrders.id],
    }),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  authExternalIdentities: many(authExternalIdentities),
  authSessions: many(authSessions),
  emailLogs: many(emailLogs),
  subscriptionTrialUsage: many(subscriptionTrialUsage),
  systemActivityLogsAsActor: many(sysActivityLogs, {
    relationName: 'sys_activity_actor_user',
  }),
  systemActivityLogsAsTarget: many(sysActivityLogs, {
    relationName: 'sys_activity_target_user',
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const authExternalIdentitiesRelations = relations(
  authExternalIdentities,
  ({ one }) => ({
    user: one(users, {
      fields: [authExternalIdentities.userId],
      references: [users.id],
    }),
  })
);

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export const paymentLogsRelations = relations(paymentLogs, ({ one }) => ({
  team: one(teams, {
    fields: [paymentLogs.teamId],
    references: [teams.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  recipientUser: one(users, {
    fields: [emailLogs.recipientUserId],
    references: [users.id],
  }),
}));

export const paymentOrdersRelations = relations(paymentOrders, ({ one }) => ({
  team: one(teams, {
    fields: [paymentOrders.teamId],
    references: [teams.id],
  }),
  template: one(subscriptionTemplates, {
    fields: [paymentOrders.subscriptionTemplateId],
    references: [subscriptionTemplates.id],
  }),
}));

export const checkoutOrdersRelations = relations(checkoutOrders, ({ one }) => ({
  team: one(teams, {
    fields: [checkoutOrders.teamId],
    references: [teams.id],
  }),
  template: one(subscriptionTemplates, {
    fields: [checkoutOrders.subscriptionTemplateId],
    references: [subscriptionTemplates.id],
  }),
}));

export const sysActivityLogsRelations = relations(sysActivityLogs, ({ one }) => ({
  actorUser: one(users, {
    fields: [sysActivityLogs.actorUserId],
    references: [users.id],
    relationName: 'sys_activity_actor_user',
  }),
  targetUser: one(users, {
    fields: [sysActivityLogs.targetUserId],
    references: [users.id],
    relationName: 'sys_activity_target_user',
  }),
  team: one(teams, {
    fields: [sysActivityLogs.teamId],
    references: [teams.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type SubscriptionTemplate = typeof subscriptionTemplates.$inferSelect;
export type NewSubscriptionTemplate = typeof subscriptionTemplates.$inferInsert;
export type SubscriptionTemplateFeature =
  typeof subscriptionTemplateFeatures.$inferSelect;
export type NewSubscriptionTemplateFeature =
  typeof subscriptionTemplateFeatures.$inferInsert;
export type SubscriptionTrialUsage = typeof subscriptionTrialUsage.$inferSelect;
export type NewSubscriptionTrialUsage =
  typeof subscriptionTrialUsage.$inferInsert;
export type AppConfig = typeof appConfigs.$inferSelect;
export type NewAppConfig = typeof appConfigs.$inferInsert;
export type PaymentLog = typeof paymentLogs.$inferSelect;
export type NewPaymentLog = typeof paymentLogs.$inferInsert;
export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
export type PaymentOrder = typeof paymentOrders.$inferSelect;
export type NewPaymentOrder = typeof paymentOrders.$inferInsert;
export type CheckoutOrder = typeof checkoutOrders.$inferSelect;
export type NewCheckoutOrder = typeof checkoutOrders.$inferInsert;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;
export type SubscriptionAssignment = typeof subscriptionAssignments.$inferSelect;
export type NewSubscriptionAssignment = typeof subscriptionAssignments.$inferInsert;
export type SubscriptionChangeRequest =
  typeof subscriptionChangeRequests.$inferSelect;
export type NewSubscriptionChangeRequest =
  typeof subscriptionChangeRequests.$inferInsert;
export type AppModule = typeof appModules.$inferSelect;
export type NewAppModule = typeof appModules.$inferInsert;
export type AppTheme = typeof appThemes.$inferSelect;
export type NewAppTheme = typeof appThemes.$inferInsert;
export type UserThemePreference = typeof userThemePreferences.$inferSelect;
export type NewUserThemePreference = typeof userThemePreferences.$inferInsert;
export type SysActivityLog = typeof sysActivityLogs.$inferSelect;
export type NewSysActivityLog = typeof sysActivityLogs.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type AuthExternalIdentity = typeof authExternalIdentities.$inferSelect;
export type NewAuthExternalIdentity = typeof authExternalIdentities.$inferInsert;
export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;
export type TeamDataWithMembers = Team & {
  paymentProvider?: string | null;
  providerReferenceId?: string | null;
  providerPlanId?: string | null;
  planName?: string | null;
  subscriptionStatus?: string | null;
  subscriptionTemplateId?: number | null;
  subscriptionTemplateName?: string | null;
  subscriptionTemplateInterval?: string | null;
  subscriptionTemplateCurrency?: string | null;
  subscriptionTemplatePriceCents?: number | null;
  subscriptionCurrentPeriodStart?: Date | null;
  subscriptionCurrentPeriodEnd?: Date | null;
  subscriptionTrialEndsAt?: Date | null;
  subscriptionCancelAtPeriodEnd?: boolean | null;
  subscriptionCanceledAt?: Date | null;
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}
