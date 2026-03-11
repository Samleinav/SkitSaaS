import 'server-only';
import { redirect } from 'next/navigation';
import { enrichUser, type RichUser } from '@skitsaas/sdk/server';
import { getUser } from '@/lib/db/queries';
import type { User } from '@/lib/db/schema';

export type { RichUser };

/**
 * Returns the current authenticated user enriched with role-check methods,
 * or null if not authenticated.
 *
 * @example
 * const user = await getCurrentUser();
 * if (!user) redirect('/sign-in');
 * if (user.isAdmin()) { ... }
 * const ctx = await user.getContext(); // → UserContext
 */
export async function getCurrentUser(): Promise<RichUser<User> | null> {
  const user = await getUser();
  return user ? enrichUser(user) : null;
}

/**
 * Like getCurrentUser() but redirects to /sign-in if not authenticated.
 * Use in server components and server actions that require a logged-in user.
 */
export async function requireCurrentUser(): Promise<RichUser<User>> {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  return user;
}
