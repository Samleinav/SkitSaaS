import { db, client } from '../lib/db/drizzle.ts';
import { users } from '../lib/db/schema.ts';

const rows = await db
  .select({
    id: users.id,
    email: users.email,
    role: users.role,
    status: users.accountStatus,
    deletedAt: users.deletedAt
  })
  .from(users)
  .limit(20);

console.log(JSON.stringify(rows, null, 2));
await client.end({ timeout: 1 });
