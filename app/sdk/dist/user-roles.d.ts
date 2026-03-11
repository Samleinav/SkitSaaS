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
export interface UserRolesConfig {
    /** Roles that grant access to the /admin area. Default: ['admin'] */
    adminAreaRoles: string[];
    /** Roles that grant access to the /dashboard area. Default: ['member', 'owner'] */
    dashboardAreaRoles: string[];
}
/**
 * Configure which roles grant admin / dashboard area access.
 * Call in sdk-server-bootstrap.ts (alongside other configure* calls).
 */
export declare function configureUserRoles(config: UserRolesConfig): void;
/**
 * Describes the access context a user operates in.
 *
 * - system_admin  — user has admin-area access
 * - team_member   — user belongs to a team (includes team owner)
 * - standalone    — authenticated but no team
 * - public        — unauthenticated
 *
 * Use via enrichUser(user).getContext() — server-side only.
 */
export type UserContext = {
    type: 'system_admin';
} | {
    type: 'team_member';
    teamId: number;
    memberRole: string;
} | {
    type: 'standalone';
    userId: number;
} | {
    type: 'public';
};
interface UserContextAdapter {
    resolve(userId: number, role: string): Promise<UserContext>;
}
/**
 * Register the host implementation that resolves a UserContext.
 * Call in sdk-server-bootstrap.ts.
 *
 * @example
 * configureUserContext({
 *   resolve: (userId, role) => getUserContext({ id: userId, role } as User),
 * });
 */
export declare function configureUserContext(adapter: UserContextAdapter): void;
export type RichUserMethods = {
    /** true if the role is in adminAreaRoles (configureUserRoles or default ['admin']) */
    isAdmin(): boolean;
    /** true if user.role === 'owner' (team owner — NOT a system admin) */
    isOwner(): boolean;
    /** true if the role is in dashboardAreaRoles (or adminAreaRoles — admin can enter dashboard) */
    isMember(): boolean;
    /** true if user.role === role */
    hasRole(role: string): boolean;
    /** true if user.role is any of the provided roles */
    hasAnyRole(...roles: string[]): boolean;
    /** true if the user can access the given area */
    canAccess(area: 'admin' | 'dashboard'): boolean;
    /**
     * Resolve the UserContext for this user.
     * Server-side only — requires configureUserContext to have been called.
     * Throws if the context adapter is not configured.
     */
    getContext(): Promise<UserContext>;
};
export type RichUser<U extends {
    role: string;
} = {
    id: number;
    role: string;
}> = U & RichUserMethods;
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
export declare function enrichUser<U extends {
    id: number;
    role: string;
}>(user: U): RichUser<U>;
export {};
