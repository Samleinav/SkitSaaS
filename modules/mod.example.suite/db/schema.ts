import {
  check,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  varchar,
  sql
} from '@skitsaas/sdk/db';

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 })
});

export const modExampleSuiteItems = pgTable(
  'mod_example_suite_items',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 120 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    priority: integer('priority').notNull().default(3),
    isPublic: boolean('is_public').notNull().default(false),
    ownerUserId: integer('owner_user_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    ownerUserIdIndex: index('mod_example_suite_items_owner_user_id_idx').on(
      table.ownerUserId
    ),
    statusIndex: index('mod_example_suite_items_status_idx').on(table.status),
    visibilityIndex: index('mod_example_suite_items_public_idx').on(
      table.isPublic
    ),
    statusCheck: check(
      'mod_example_suite_items_status_chk',
      sql`${table.status} in ('draft', 'active', 'archived')`
    ),
    priorityCheck: check(
      'mod_example_suite_items_priority_chk',
      sql`${table.priority} between 1 and 5`
    )
  })
);

export const modExampleSuiteSettings = pgTable(
  'mod_example_suite_settings',
  {
    id: serial('id').primaryKey(),
    settingKey: varchar('setting_key', { length: 100 }).notNull(),
    settingValue: text('setting_value').notNull(),
    updatedByUserId: integer('updated_by_user_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
  },
  (table) => ({
    settingKeyUnique: uniqueIndex('mod_example_suite_settings_key_idx').on(
      table.settingKey
    )
  })
);

export type ModExampleSuiteItem = typeof modExampleSuiteItems.$inferSelect;
export type NewModExampleSuiteItem = typeof modExampleSuiteItems.$inferInsert;
export type ModExampleSuiteSetting = typeof modExampleSuiteSettings.$inferSelect;
export type NewModExampleSuiteSetting = typeof modExampleSuiteSettings.$inferInsert;
