const { db, client } = require('../lib/db/drizzle');
const { users } = require('../lib/db/schema');

async function main() {
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
}

main().catch(async (error) => {
  console.error(error);
  try {
    await client.end({ timeout: 1 });
  } catch {}
  process.exit(1);
});
