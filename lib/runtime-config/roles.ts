/**
 * Central role accessors — single source of truth for area roles.
 *
 * All proxies, guards, context detection and form security read from here.
 * Configure roles in app.config.ts under the `roles` key.
 *
 * This module is Edge Runtime compatible (imports only app.config.ts, no
 * Node.js APIs). New Set() is created per call — if called in a hot path,
 * consider caching the result at the call site.
 */
import appConfig from '@/app.config';
import type { RoleContextAffinity } from './types';

const DEFAULT_ADMIN_ROLES = ['admin', 'owner'] as const;
const DEFAULT_DASHBOARD_ROLES = ['member'] as const;

/**
 * Returns the set of roles allowed to access the /admin area.
 * Reads from app.config.ts → roles.adminArea, falls back to ['admin', 'owner'].
 */
export function getAdminAreaRoles(): Set<string> {
  const configured = appConfig.roles?.adminArea;
  return new Set(configured?.length ? configured : DEFAULT_ADMIN_ROLES);
}

/**
 * Returns the set of roles allowed to access the /dashboard area.
 * Reads from app.config.ts → roles.dashboardArea, falls back to ['member'].
 * Admin-area roles are always implicitly allowed in the dashboard.
 */
export function getDashboardAreaRoles(): Set<string> {
  const configured = appConfig.roles?.dashboardArea;
  return new Set(configured?.length ? configured : DEFAULT_DASHBOARD_ROLES);
}

/**
 * Returns the forced UserContext type for a given role, or null if the
 * default team-membership detection should be used.
 *
 * Configure in app.config.ts → roles.contextAffinity.
 */
export function getRoleContextAffinity(role: string): RoleContextAffinity | null {
  return appConfig.roles?.contextAffinity?.[role] ?? null;
}

/**
 * Returns true if the given role grants access to the /admin area.
 */
export function isAdminRole(role: string): boolean {
  return getAdminAreaRoles().has(role);
}
