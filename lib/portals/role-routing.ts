import { portalMetaRegistry } from '@skitsaas/sdk';

/**
 * Given a user's role, returns the URL they should be redirected to after login.
 *
 * Priority:
 * 1. Admin: canAccessAdmin flag → /admin
 * 2. Portal: checks registered portals for redirectRoles match → /portalName
 * 3. Fallback: /dashboard
 *
 * Modules declare their redirect roles in RoutePortal().register({ redirectRoles: ['teacher'] }).
 */
export function resolveRoleRedirect(
  role: string | null | undefined,
  canAccessAdmin: boolean
): string {
  if (canAccessAdmin) return '/admin';

  if (role) {
    for (const [portalName, meta] of portalMetaRegistry) {
      if (meta.redirectRoles?.includes(role)) {
        return `/${portalName}`;
      }
    }
  }

  return '/dashboard';
}
