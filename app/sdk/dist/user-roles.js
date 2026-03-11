/**
 * RichUser — enriches any user-shaped object with role-check methods.
 *
 * SDK-first pattern: two adapters allow host projects to configure:
 *   1. configureUserRoles  — which roles grant admin / dashboard access
 *   2. configureUserContext — resolves a UserContext for a user (DB call)
 *
 * Adapters are configured once in sdk-server-bootstrap.ts.
 * Client-side code can call all methods except getContext() (which requires
 * the context adapter — server-only).
 */
let _rolesConfig = null;
/**
 * Configure which roles grant admin / dashboard area access.
 * Call in sdk-server-bootstrap.ts (alongside other configure* calls).
 */
export function configureUserRoles(config) {
    _rolesConfig = config;
}
// NOTE: owner is a team-level concept (dashboard access).
// owner is NEVER an admin role by default — they are independent.
function adminRolesSet() {
    return new Set(_rolesConfig?.adminAreaRoles ?? ['admin']);
}
function dashboardRolesSet() {
    return new Set(_rolesConfig?.dashboardAreaRoles ?? ['member', 'owner']);
}
let _contextAdapter = null;
/**
 * Register the host implementation that resolves a UserContext.
 * Call in sdk-server-bootstrap.ts.
 *
 * @example
 * configureUserContext({
 *   resolve: (userId, role) => getUserContext({ id: userId, role } as User),
 * });
 */
export function configureUserContext(adapter) {
    _contextAdapter = adapter;
}
/**
 * Enrich a user-shaped object with role-check and context-resolution methods.
 *
 * Works with any object that has `id: number` and `role: string`.
 * All methods except getContext() are safe to call on client and server.
 *
 * @example Server (full feature)
 * const user = await getCurrentUser();   // returns RichUser<User>
 * if (!user.isAdmin()) redirect('/dashboard');
 * const ctx = await user.getContext();   // → UserContext
 *
 * @example Client (role checks only)
 * import { enrichUser } from '@skitsaas/sdk';
 * const isAdmin = user ? enrichUser(user).isAdmin() : false;
 */
export function enrichUser(user) {
    return {
        ...user,
        isAdmin: () => adminRolesSet().has(user.role),
        isOwner: () => user.role === 'owner',
        isMember: () => dashboardRolesSet().has(user.role) || adminRolesSet().has(user.role),
        hasRole: (role) => user.role === role,
        hasAnyRole: (...roles) => roles.includes(user.role),
        canAccess: (area) => area === 'admin'
            ? adminRolesSet().has(user.role)
            : dashboardRolesSet().has(user.role) || adminRolesSet().has(user.role),
        getContext: () => {
            if (!_contextAdapter) {
                throw new Error('[enrichUser] UserContext adapter not configured. ' +
                    'Call configureUserContext() in sdk-server-bootstrap.ts before getContext().');
            }
            return _contextAdapter.resolve(user.id, user.role);
        },
    };
}
