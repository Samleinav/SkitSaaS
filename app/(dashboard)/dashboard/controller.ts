import { redirect } from 'next/navigation';
import {
  createServerActionController,
  createValidatedServerActionController
} from '@/lib/actions/controller';
import { getUser } from '@/lib/db/queries';
import { revalidatePath } from 'next/cache';
import {
  getCurrentFeatureControllerByScope,
  getCurrentScopedFeatureController,
  type FeatureScope
} from '@/lib/features/subscription';

async function requireDashboardUser() {
  const currentUser = await getUser();
  if (!currentUser) {
    redirect('/login');
  }

  return currentUser;
}

export const dashboardAction = createServerActionController({
  requireUser: requireDashboardUser
});

export const dashboardValidatedAction = createValidatedServerActionController({
  requireUser: requireDashboardUser
});

export function revalidateDashboardRoot() {
  revalidatePath('/dashboard');
}

export async function getDashboardFeatureController(
  scope: FeatureScope = 'organization'
) {
  return getCurrentFeatureControllerByScope(scope);
}

export async function getDashboardScopedFeatureController() {
  return getCurrentScopedFeatureController();
}
