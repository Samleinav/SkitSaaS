import { sql } from 'drizzle-orm'

const SOFT_DELETE_EMAIL_SUFFIX_LENGTH = 9
const USER_EMAIL_MAX_LENGTH = 255

export function buildSoftDeletedEmailSql() {
  return sql`concat(
    left(
      email,
      greatest(0, ${USER_EMAIL_MAX_LENGTH} - length(cast(id as text)) - ${SOFT_DELETE_EMAIL_SUFFIX_LENGTH})
    ),
    '-',
    id,
    '-deleted'
  )`
}
