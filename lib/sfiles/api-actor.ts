import type { SFilesActorContext } from '@skitsaas/sdk/sfiles';
import { getCurrentSfilesActor } from '@skitsaas/sdk/server';

/**
 * Resolve the current request's actor context for Sfiles permission checks.
 * Returns null if the user is not authenticated.
 */
export async function getSfilesActor(): Promise<SFilesActorContext | null> {
  const actor = await getCurrentSfilesActor();
  return actor.userId === null ? null : actor;
}
