require('dotenv').config();
const postgres = require('postgres');

async function main() {
  const sql = postgres(process.env.POSTGRES_URL);
  const rows = await sql`
    select id, email, role, account_status, deleted_at
    from users
    order by id asc
    limit 20
  `;

  console.log(JSON.stringify(rows, null, 2));
  await sql.end({ timeout: 1 });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
