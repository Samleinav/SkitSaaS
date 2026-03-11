import { getUser } from '@/lib/db/queries';
import type { SFilesActorContext } from '@skitsaas/sdk/sfiles';
import { enrichUser } from '@skitsaas/sdk';

/**
 * Resolve the current request's actor context for Sfiles permission checks.
 * Returns null if the user is not authenticated.
 */
export async function getSfilesActor(): Promise<SFilesActorContext | null> {
  const user = await getUser();
  if (!user) return null;
  return {
    userId: user.id,
    isAdmin: enrichUser({ id: user.id, role: (user as { role?: string }).role ?? '' }).isAdmin(),
  };
}
