export type ModuleRuntimeMode = 'db' | 'config' | 'hybrid';

export type ModuleFlags = Record<string, boolean>;

/**
 * When a role has a contextAffinity, getUserContext() will force users with
 * that role into the specified context regardless of team membership:
 *
 *   'standalone'   → always UserContext { type: 'standalone' }
 *   'team_member'  → always UserContext { type: 'team_member' } (if in a team,
 *                    falls back to 'standalone' when not)
 *
 * Roles without an explicit affinity use the default behavior:
 * standalone if teams are disabled or the user has no team membership,
 * team_member if the user belongs to a team.
 */
export type RoleContextAffinity = 'standalone' | 'team_member';

export type AppConfigRoles = {
  /**
   * Roles that can access the /admin area.
   * Defaults to ['admin', 'owner'] if not set.
   */
  adminArea?: string[];
  /**
   * Roles that can access the /dashboard area.
   * Defaults to ['member'] if not set.
   * Note: adminArea roles always resolve to system_admin context in the dashboard.
   */
  dashboardArea?: string[];
  /**
   * Map a role to a fixed UserContext type, overriding the default
   * team-membership detection in getUserContext().
   *
   * Example:
   *   contextAffinity: {
   *     guardian: 'standalone',   // Guardian users → always standalone context
   *     teacher:  'team_member',  // Teacher users  → always team context
   *     staff:    'team_member',  // Staff users    → always team context
   *   }
   */
  contextAffinity?: Record<string, RoleContextAffinity>;
};

export type AppConfig = {
  projectName: string;
  moduleRuntimeMode: ModuleRuntimeMode;
  modules: ModuleFlags;
  roles?: AppConfigRoles;
};

export type ResolvedAppConfig = {
  projectName: string;
  moduleRuntimeMode: ModuleRuntimeMode;
  modules: ModuleFlags;
  roles?: AppConfigRoles;
};
