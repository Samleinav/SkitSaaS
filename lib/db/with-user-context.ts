import { sql } from 'drizzle-orm';
import { db } from './drizzle';

/**
 * Executes `fn` inside a transaction with the RLS user context set.
 *
 * Before running any query, it calls `set_config('app.user_id', ...)` so
 * PostgreSQL RLS policies that check `current_setting('app.user_id')` can
 * enforce per-user row isolation.
 *
 * Usage (dashboard server actions):
 *
 *   const user = await getUser();
 *   return withUserContext(user.id, (tx) =>
 *     tx.update(users).set({ name }).where(eq(users.id, user.id))
 *   );
 */
export async function withUserContext<T>(
  userId: number,
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // `true` as the third arg means the setting is local to the transaction
    await tx.execute(
      sql`SELECT set_config('app.user_id', ${String(userId)}, true)`
    );
    return fn(tx as unknown as typeof db);
  });
}
