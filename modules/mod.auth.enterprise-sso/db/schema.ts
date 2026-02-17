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
  id: integer('id').primaryKey(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 100 }),
  role: varchar('role', { length: 20 }),
  accountStatus: varchar('account_status', { length: 20 }),
  passwordHash: text('password_hash'),
  deletedAt: timestamp('deleted_at')
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow()
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
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    providerSubjectUnique: uniqueIndex(
      'auth_external_identities_provider_subject_idx'
    ).on(table.providerId, table.providerSubject),
    userProviderUnique: uniqueIndex(
      'auth_external_identities_user_provider_idx'
    ).on(table.userId, table.providerId)
  })
);

export const modAuthEnterpriseSsoStates = pgTable(
  'mod_auth_enterprise_sso_states',
  {
    id: serial('id').primaryKey(),
    providerId: varchar('provider_id', { length: 80 }).notNull(),
    tenantId: varchar('tenant_id', { length: 80 }).notNull(),
    flow: varchar('flow', { length: 20 }).notNull().default('login'),
    stateToken: varchar('state_token', { length: 180 }).notNull(),
    stateNonce: varchar('state_nonce', { length: 180 }),
    pkceCodeVerifier: text('pkce_code_verifier'),
    relayRequestId: varchar('relay_request_id', { length: 180 }),
    area: varchar('area', { length: 20 }).notNull().default('dashboard'),
    redirectTo: text('redirect_to'),
    requestedByUserId: integer('requested_by_user_id').references(() => users.id),
    metadata: text('metadata'),
    issuedAt: timestamp('issued_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    consumedAt: timestamp('consumed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    stateTokenUnique: uniqueIndex('mod_auth_enterprise_sso_state_token_idx').on(
      table.stateToken
    ),
    providerTenantExpiryIndex: index(
      'mod_auth_enterprise_sso_provider_tenant_exp_idx'
    ).on(table.providerId, table.tenantId, table.expiresAt),
    requestedByIndex: index('mod_auth_enterprise_sso_requested_by_idx').on(
      table.requestedByUserId
    ),
    flowCheck: check(
      'mod_auth_enterprise_sso_flow_chk',
      sql`${table.flow} in ('login', 'link')`
    ),
    areaCheck: check(
      'mod_auth_enterprise_sso_area_chk',
      sql`${table.area} in ('admin', 'dashboard')`
    )
  })
);

export type ModAuthEnterpriseSsoState =
  typeof modAuthEnterpriseSsoStates.$inferSelect;
export type NewModAuthEnterpriseSsoState =
  typeof modAuthEnterpriseSsoStates.$inferInsert;
