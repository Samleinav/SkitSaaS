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
  id: integer('id').primaryKey(),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 100 }),
  role: varchar('role', { length: 20 }),
  accountStatus: varchar('account_status', { length: 20 }),
  deletedAt: timestamp('deleted_at')
});

export const modAuthPasskeyChallenges = pgTable(
  'mod_auth_passkey_challenges',
  {
    id: serial('id').primaryKey(),
    challengeId: varchar('challenge_id', { length: 120 }).notNull(),
    flow: varchar('flow', { length: 30 }).notNull(),
    challenge: text('challenge').notNull(),
    userId: integer('user_id').references(() => users.id),
    expectedOrigin: text('expected_origin').notNull(),
    expectedRpId: varchar('expected_rp_id', { length: 255 }).notNull(),
    expectedType: varchar('expected_type', { length: 30 }).notNull(),
    metadata: text('metadata'),
    issuedAt: timestamp('issued_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at').notNull(),
    consumedAt: timestamp('consumed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    challengeIdUnique: uniqueIndex('mod_auth_passkey_challenge_id_idx').on(
      table.challengeId
    ),
    flowExpiresIndex: index('mod_auth_passkey_challenges_flow_expires_idx').on(
      table.flow,
      table.expiresAt
    ),
    userFlowIndex: index('mod_auth_passkey_challenges_user_flow_idx').on(
      table.userId,
      table.flow
    ),
    flowCheck: check(
      'mod_auth_passkey_challenges_flow_chk',
      sql`${table.flow} in ('registration', 'authentication')`
    ),
    expectedTypeCheck: check(
      'mod_auth_passkey_challenges_expected_type_chk',
      sql`${table.expectedType} in ('webauthn.create', 'webauthn.get')`
    )
  })
);

export const modAuthPasskeyCredentials = pgTable(
  'mod_auth_passkey_credentials',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    credentialId: text('credential_id').notNull(),
    publicKey: text('public_key').notNull(),
    counter: integer('counter').notNull().default(0),
    transports: text('transports'),
    deviceType: varchar('device_type', { length: 30 })
      .notNull()
      .default('single_device'),
    backedUp: boolean('backed_up').notNull().default(false),
    aaguid: varchar('aaguid', { length: 64 }),
    nickname: varchar('nickname', { length: 120 }),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    credentialIdUnique: uniqueIndex('mod_auth_passkey_credential_id_idx').on(
      table.credentialId
    ),
    activeUserIndex: index('mod_auth_passkey_credentials_active_user_idx').on(
      table.userId,
      table.revokedAt
    ),
    counterCheck: check(
      'mod_auth_passkey_credentials_counter_chk',
      sql`${table.counter} >= 0`
    ),
    deviceTypeCheck: check(
      'mod_auth_passkey_credentials_device_type_chk',
      sql`${table.deviceType} in ('single_device', 'multi_device')`
    )
  })
);

export type ModAuthPasskeyChallenge = typeof modAuthPasskeyChallenges.$inferSelect;
export type NewModAuthPasskeyChallenge = typeof modAuthPasskeyChallenges.$inferInsert;

export type ModAuthPasskeyCredential =
  typeof modAuthPasskeyCredentials.$inferSelect;
export type NewModAuthPasskeyCredential =
  typeof modAuthPasskeyCredentials.$inferInsert;
