import {
  index,
  pgTable,
  serial,
  text,
  timestamp,
  varchar
} from '@skitsaas/sdk/db';

export const modContactSubmissions = pgTable(
  'mod_contact_submissions',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 180 }),
    message: text('message').notNull(),
    sourcePath: varchar('source_path', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => ({
    createdAtIndex: index('mod_contact_submissions_created_at_idx').on(
      table.createdAt
    ),
    emailIndex: index('mod_contact_submissions_email_idx').on(table.email)
  })
);

export type ModContactSubmission = typeof modContactSubmissions.$inferSelect;
