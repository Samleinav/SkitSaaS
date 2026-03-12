import { portalMetaRegistry } from '@skitsaas/sdk';

/**
 * Given a user's role, returns the URL they should be redirected to after login.
 *
 * Priority:
 * 1. Admin: canAccessAdmin flag → /admin
 * 2. Portal role match: redirectRoles includes the user's role → /portalName
 * 3. Default portal: isDefaultPortal: true → /portalName
 * 4. Fallback: /dashboard
 *
 * Modules declare their redirect roles in RoutePortal().register({ redirectRoles: ['teacher'] }).
 * Modules declare a default destination with RoutePortal().register({ isDefaultPortal: true }).
 */
export function resolveRoleRedirect(
  role: string | null | undefined,
  canAccessAdmin: boolean
): string {
  if (canAccessAdmin) return '/admin';

  let defaultPortalName: string | null = null;

  for (const [portalName, meta] of portalMetaRegistry) {
    if (role && meta.redirectRoles?.includes(role)) {
      return `/${portalName}`;
    }
    if (meta.isDefaultPortal) {
      defaultPortalName = portalName;
    }
  }

  if (defaultPortalName) return `/${defaultPortalName}`;

  return '/dashboard';
}
